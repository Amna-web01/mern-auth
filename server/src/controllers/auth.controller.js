import { User, ROLES } from '../models/User.js';
import { Token } from '../models/Token.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateRandomToken,
} from '../services/token.service.js';
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
} from '../services/email.service.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE = 'refreshToken';
const ACCESS_COOKIE = 'accessToken';

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'strict' : 'lax',
  maxAge,
});

const parseDuration = (str) => {
  const match = /^(\d+)([smhd])$/.exec(str);
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const [, n, unit] = match;
  const mult = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  }[unit];

  return Number(n) * mult;
};

const issueTokens = async (user, req, res) => {
  const accessToken = signAccessToken({
    sub: user._id,
    role: user.role
  });

  const refreshToken = signRefreshToken({
    sub: user._id
  });

  await Token.create({
    user: user._id,
    refreshTokenHash: hashToken(refreshToken),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    expiresAt: new Date(
      Date.now() + parseDuration(env.jwt.refreshExpires)
    ),
  });

  res.cookie(
    ACCESS_COOKIE,
    accessToken,
    cookieOptions(parseDuration(env.jwt.accessExpires))
  );

  res.cookie(
    REFRESH_COOKIE,
    refreshToken,
    cookieOptions(parseDuration(env.jwt.refreshExpires))
  );

  return {
    accessToken,
    refreshToken
  };
};

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });

  if (existing)
    throw new ApiError(409, 'Email already registered');

  const user = await User.create({
    name,
    email,
    password
  });

  const verificationToken = generateRandomToken();

  user.emailVerificationToken = hashToken(verificationToken);

  user.emailVerificationExpires = new Date(
    Date.now() + 60 * 60 * 1000
  );

  await user.save({
    validateBeforeSave: false
  });

  await sendVerificationEmail(
    user,
    verificationToken
  );

  const { accessToken, refreshToken } =
    await issueTokens(user, req, res);

  res.status(201).json({
    success: true,
    message: 'Registered. Please verify your email.',
    data: {
      user: user.toSafeJSON(),
      accessToken,
      refreshToken
    },
  });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email })
    .select('+password');

  if (!user || !user.password)
    throw new ApiError(401, 'Invalid credentials');

  const isMatch =
    await user.comparePassword(password);

  if (!isMatch)
    throw new ApiError(401, 'Invalid credentials');

  user.lastLogin = new Date();

  await user.save({
    validateBeforeSave: false
  });

  const { accessToken, refreshToken } =
    await issueTokens(user, req, res);

  res.json({
    success: true,
    message: 'Logged in',
    data: {
      user: user.toSafeJSON(),
      accessToken,
      refreshToken
    },
  });
});

// POST /api/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const token =
    req.cookies?.[REFRESH_COOKIE] ||
    req.body?.refreshToken;

  if (!token)
    throw new ApiError(401, 'No refresh token');

  let decoded;

  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(
      401,
      'Invalid refresh token'
    );
  }

  const stored = await Token.findOne({
    user: decoded.sub,
    refreshTokenHash: hashToken(token),
    revoked: false,
  });

  if (!stored || stored.expiresAt < new Date())
    throw new ApiError(
      401,
      'Refresh token revoked or expired'
    );

  // Rotate refresh token
  stored.revoked = true;

  await stored.save();

  const user = await User.findById(decoded.sub);

  if (!user)
    throw new ApiError(401, 'User not found');

  const { accessToken, refreshToken } =
    await issueTokens(user, req, res);

  res.json({
    success: true,
    data: {
      user: user.toSafeJSON(),
      accessToken,
      refreshToken
    },
  });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  const token =
    req.cookies?.[REFRESH_COOKIE] ||
    req.body?.refreshToken;

  if (token) {
    await Token.updateOne(
      {
        refreshTokenHash: hashToken(token)
      },
      {
        $set: {
          revoked: true
        }
      }
    );
  }

  res.clearCookie(ACCESS_COOKIE);
  res.clearCookie(REFRESH_COOKIE);

  res.json({
    success: true,
    message: 'Logged out'
  });
});

// POST /api/auth/logout-all
export const logoutAll = asyncHandler(async (req, res) => {
  await Token.updateMany(
    {
      user: req.user._id
    },
    {
      $set: {
        revoked: true
      }
    }
  );

  res.clearCookie(ACCESS_COOKIE);
  res.clearCookie(REFRESH_COOKIE);

  res.json({
    success: true,
    message: 'Logged out from all devices'
  });
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.toSafeJSON()
    }
  });
});

// GET /api/auth/verify-email?token=xxx
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token)
    throw new ApiError(400, 'Token required');

  const hashed = hashToken(token);

  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpires: {
      $gt: new Date()
    },
  }).select(
    '+emailVerificationToken +emailVerificationExpires'
  );

  if (!user)
    throw new ApiError(
      400,
      'Invalid or expired verification token'
    );

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  await user.save({
    validateBeforeSave: false
  });

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
});

// POST /api/auth/resend-verification
export const resendVerification =
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      email: req.body.email
    });

    if (!user)
      throw new ApiError(404, 'User not found');

    if (user.isEmailVerified)
      throw new ApiError(
        400,
        'Email already verified'
      );

    const token = generateRandomToken();

    user.emailVerificationToken =
      hashToken(token);

    user.emailVerificationExpires =
      new Date(Date.now() + 60 * 60 * 1000);

    await user.save({
      validateBeforeSave: false
    });

    await sendVerificationEmail(
      user,
      token
    );

    res.json({
      success: true,
      message: 'Verification email sent'
    });
  });

// POST /api/auth/forgot-password
export const forgotPassword =
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      email: req.body.email
    });

    // Always respond OK (prevent user enumeration)
    if (!user) {
      return res.json({
        success: true,
        message:
          'If that email exists, a reset link was sent'
      });
    }

    const token = generateRandomToken();

    user.passwordResetToken =
      hashToken(token);

    user.passwordResetExpires =
      new Date(Date.now() + 60 * 60 * 1000);

    await user.save({
      validateBeforeSave: false
    });

    await sendResetPasswordEmail(
      user,
      token
    );

    res.json({
      success: true,
      message:
        'If that email exists, a reset link was sent'
    });
  });

// POST /api/auth/reset-password
export const resetPassword =
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    const user = await User.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpires: {
        $gt: new Date()
      },
    }).select(
      '+passwordResetToken +passwordResetExpires'
    );

    if (!user)
      throw new ApiError(
        400,
        'Invalid or expired reset token'
      );

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();

    await user.save();

    // Revoke all refresh tokens
    await Token.updateMany(
      {
        user: user._id
      },
      {
        $set: {
          revoked: true
        }
      }
    );

    res.json({
      success: true,
      message:
        'Password reset successful. Please log in.'
    });
  });

// GET /api/auth/google/callback
export const googleCallback =
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user)
      throw new ApiError(
        401,
        'Google auth failed'
      );

    await issueTokens(user, req, res);

    // Redirect to frontend; the SPA will call /me using cookies
    res.redirect(
      `${env.clientUrl}/oauth/callback`
    );
  });

// Admin example: change role
export const changeRole =
  asyncHandler(async (req, res) => {
    const { userId, role } = req.body;

    if (!Object.values(ROLES).includes(role))
      throw new ApiError(
        400,
        'Invalid role'
      );

    const user =
      await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true }
      );

    if (!user)
      throw new ApiError(
        404,
        'User not found'
      );

    res.json({
      success: true,
      data: {
        user: user.toSafeJSON()
      }
    });
  });
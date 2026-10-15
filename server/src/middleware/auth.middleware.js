import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../services/token.service.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, _res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) token = authHeader.split(' ')[1];
  else if (req.cookies?.accessToken) token = req.cookies.accessToken;

  if (!token) throw new ApiError(401, 'Not authenticated');

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);
    if (!user) throw new ApiError(401, 'User no longer exists');
    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }
});
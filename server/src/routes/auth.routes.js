import { Router } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';

import * as ctrl from '../controllers/auth.controller.js';

import {
  protect
} from '../middleware/auth.middleware.js';

import {
  authorize
} from '../middleware/role.middleware.js';

import {
  validate
} from '../middleware/validate.middleware.js';

import {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
} from '../validations/auth.validation.js';

import { env } from '../config/env.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many attempts, try again later'
  },
});

router.post(
  '/register',
  authLimiter,
  registerRules,
  validate,
  ctrl.register
);

router.post(
  '/login',
  authLimiter,
  loginRules,
  validate,
  ctrl.login
);

router.post(
  '/refresh',
  ctrl.refresh
);

router.post(
  '/logout',
  ctrl.logout
);

router.post(
  '/logout-all',
  protect,
  ctrl.logoutAll
);

router.get(
  '/me',
  protect,
  ctrl.me
);

router.get(
  '/verify-email',
  ctrl.verifyEmail
);

router.post(
  '/resend-verification',
  authLimiter,
  ctrl.resendVerification
);

router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordRules,
  validate,
  ctrl.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  resetPasswordRules,
  validate,
  ctrl.resetPassword
);

// Admin route
router.post(
  '/change-role',
  protect,
  authorize('admin'),
  ctrl.changeRole
);

// Google OAuth
router.get(
  '/google',
  passport.authenticate(
    'google',
    {
      scope: ['profile', 'email'],
      session: false
    }
  )
);

router.get(
  '/google/callback',
  passport.authenticate(
    'google',
    {
      session: false,
      failureRedirect:
        `${env.clientUrl}/login?error=oauth_failed`,
    }
  ),
  ctrl.googleCallback
);

export default router;
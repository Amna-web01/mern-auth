import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import authRoutes from './routes/auth.routes.js';

import {
  notFound,
  errorHandler
} from './middleware/error.middleware.js';

import {
  configurePassport
} from './config/passport.js';

import { env } from './config/env.js';

export const createApp = () => {
  const app = express();

  configurePassport();

  app.use(passport.initialize());

  app.use(helmet());

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );

  app.use(
    express.json({
      limit: '10kb'
    })
  );

  app.use(
    express.urlencoded({
      extended: true
    })
  );

  app.use(cookieParser());

  if (env.nodeEnv === 'development')
    app.use(morgan('dev'));

  app.get(
    '/health',
    (_req, res) =>
      res.json({
        ok: true,
        ts: Date.now()
      })
  );

  app.use(
    '/api/auth',
    authRoutes
  );

  app.use(notFound);

  app.use(errorHandler);

  return app;
};
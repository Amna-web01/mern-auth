import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';
import { User, ROLES } from '../models/User.js';

export const configurePassport = () => {
  if (!env.google.clientId || !env.google.clientSecret) return;

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'), null);

          let user = await User.findOne({ email });
          if (!user) {
            user = await User.create({
              name: profile.displayName || 'Google User',
              email,
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value,
              isEmailVerified: true,
              role: ROLES.USER,
            });
          } else if (!user.googleId) {
            user.googleId = profile.id;
            user.isEmailVerified = true;
            if (!user.avatar) user.avatar = profile.photos?.[0]?.value;
            await user.save();
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
};
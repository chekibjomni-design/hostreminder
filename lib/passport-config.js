const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const OAuth2Strategy = require('passport-oauth2').Strategy; // generic for Airbnb
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('./logger');

module.exports = function(passportInstance) {
  // Serialize / deserialize user ID into session
  passportInstance.serializeUser((user, done) => {
    done(null, user.id);
  });

  passportInstance.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // ---------- Google ----------
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passportInstance.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.APP_URL || ''}/api/auth/google/callback`,
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        if (!email) return done(null, false, { message: 'No email from Google' });
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName || email,
              password: '' // password not used for OAuth accounts
            }
          });
        }
        return done(null, user);
      } catch (e) {
        logger.error(`Google OAuth error: ${e.message}`);
        return done(e);
      }
    }));
  }

  // ---------- Facebook ----------
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passportInstance.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || `${process.env.APP_URL || ''}/api/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'emails']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        if (!email) return done(null, false, { message: 'No email from Facebook' });
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName || email,
              password: ''
            }
          });
        }
        return done(null, user);
      } catch (e) {
        logger.error(`Facebook OAuth error: ${e.message}`);
        return done(e);
      }
    }));
  }

  // ---------- Airbnb (generic OAuth2) ----------
  if (process.env.AIRBNB_CLIENT_ID && process.env.AIRBNB_CLIENT_SECRET) {
    passportInstance.use('airbnb', new OAuth2Strategy({
      authorizationURL: 'https://www.airbnb.com/oauth2/authorize',
      tokenURL: 'https://api.airbnb.com/v1/oauth2/token',
      clientID: process.env.AIRBNB_CLIENT_ID,
      clientSecret: process.env.AIRBNB_CLIENT_SECRET,
      callbackURL: process.env.AIRBNB_CALLBACK_URL || `${process.env.APP_URL || ''}/api/auth/airbnb/callback`
    }, async (accessToken, refreshToken, params, profile, done) => {
      try {
        // Airbnb does not return a profile directly in the OAuth2 flow.
        // For demo purposes we will create a synthetic email based on the access token.
        const syntheticEmail = `airbnb_${accessToken.slice(0, 8)}@example.com`;
        let user = await prisma.user.findUnique({ where: { email: syntheticEmail } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: syntheticEmail,
              name: 'Airbnb User',
              password: ''
            }
          });
        }
        return done(null, user);
      } catch (e) {
        logger.error(`Airbnb OAuth error: ${e.message}`);
        return done(e);
      }
    }));
  }
};

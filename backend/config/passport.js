// backend/config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import dotenv from "dotenv";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

dotenv.config();

const DEFAULT_PROFILE_PICTURE = "/assets/main-logo/default_avatar.png"; // Adjust if needed

// --- Helper Functions ---
const sanitizeUsername = (name) => {
  // ... (implementation unchanged)
  if (!name) return `user_${Math.random().toString(36).substring(2, 8)}`;
  let sanitized = name
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!sanitized || sanitized.length < 3) {
    sanitized = `user_${sanitized}${Math.random()
      .toString(36)
      .substring(2, 6)}`;
  }
  return sanitized.slice(0, 30);
};

// --- Google OAuth Strategy (for Users) ---
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        // Add passReqToCallback if you need request details (rarely needed for Google)
        // passReqToCallback: true,
      },
      // async (req, accessToken, refreshToken, profile, done) => { // If using passReqToCallback
      async (accessToken, refreshToken, profile, done) => {
        console.log(
          "Google Strategy: Received profile",
          profile?.id,
          profile?.emails?.[0]?.value
        ); // Log profile info
        if (typeof User?.findOne !== "function") {
          const errMsg =
            "FATAL: User model not loaded in Passport Google strategy.";
          console.error(errMsg);
          return done(
            new Error("Server configuration error: User model."),
            null
          );
        }
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            console.error(
              "Google Strategy: Could not retrieve email from profile."
            );
            return done(
              new Error("Could not retrieve email from Google profile."),
              false
            );
          }

          let existingUser = await User.findOne({
            $or: [{ googleId: profile.id }, { email: email }],
          });
          const now = new Date();

          if (existingUser) {
            console.log(`Google Strategy: Found existing user for ${email}`);
            // ... (update logic unchanged) ...
            const updateFields = { recentLogin: now };
            let needsUpdate = false;
            if (!existingUser.googleId) {
              updateFields.googleId = profile.id;
              needsUpdate = true;
              console.log("Google Strategy: Queuing googleId link.");
            }
            const googlePic = profile.photos?.[0]?.value;
            if (
              googlePic &&
              (!existingUser.profilePicture ||
                googlePic !== existingUser.profilePicture)
            ) {
              updateFields.profilePicture = googlePic;
              needsUpdate = true;
              console.log("Google Strategy: Queuing profile picture update.");
            }
            const googleDisplayName = profile.displayName;
            if (
              googleDisplayName &&
              (!existingUser.displayName ||
                googleDisplayName !== existingUser.displayName)
            ) {
              updateFields.displayName = googleDisplayName;
              needsUpdate = true;
              console.log("Google Strategy: Queuing display name update.");
            }
            if (needsUpdate) {
              const updatedUser = await User.findByIdAndUpdate(
                existingUser._id,
                { $set: updateFields },
                { new: true }
              );
              console.log(
                "Google Strategy: Updated existing user DB record:",
                updatedUser?.email || existingUser.email
              );
              return done(null, updatedUser || existingUser);
            } else {
              await User.findByIdAndUpdate(existingUser._id, {
                $set: { recentLogin: now },
              });
              console.log(
                "Google Strategy: Existing user requires no profile update."
              );
              return done(null, existingUser);
            }
          } else {
            console.log(`Google Strategy: Creating new user for ${email}`);
            // ... (username generation unchanged) ...
            const emailPrefix = email.split("@")[0];
            let potentialUsername = sanitizeUsername(emailPrefix);
            let usernameExists = await User.findOne({
              username: potentialUsername,
            });
            let attemptCount = 0;
            while (usernameExists && attemptCount < 5) {
              attemptCount++;
              potentialUsername = sanitizeUsername(
                `${emailPrefix}_${Math.random().toString(36).substring(2, 6)}`
              );
              usernameExists = await User.findOne({
                username: potentialUsername,
              });
            }
            if (usernameExists) {
              console.error(
                "Google Strategy: Could not create unique username."
              );
              return done(
                new Error("Could not create unique username."),
                false
              );
            }

            const newUser = new User({
              googleId: profile.id,
              email: email,
              username: potentialUsername,
              displayName: profile.displayName || potentialUsername,
              profilePicture:
                profile.photos?.[0]?.value || DEFAULT_PROFILE_PICTURE,
              recentLogin: now,
            });
            await newUser.save();
            console.log(
              "Google Strategy: New user created successfully:",
              newUser.email
            );
            return done(null, newUser);
          }
        } catch (err) {
          console.error(
            "Google Strategy: Error caught in verify callback:",
            err
          );
          if (err.code === 11000)
            return done(
              new Error("Account conflict during Google sign-in."),
              false
            );
          // Pass the original error for better debugging in the callback handler
          return done(err, false);
        }
      }
    )
  );
} else {
  console.warn(
    "Google OAuth credentials not configured. Google login disabled."
  );
}

// --- Local Strategy (for Admins) ---
passport.use(
  /* ... Local strategy unchanged ... */
  "local-admin",
  new LocalStrategy(
    { usernameField: "username" },
    async (username, password, done) => {
      if (typeof Admin?.findOne !== "function") {
        console.error(
          "FATAL: Admin model not loaded in Passport Local strategy."
        );
        return done(
          new Error("Server configuration error: Admin model."),
          null
        );
      }
      try {
        console.log(`Local Strategy: Attempting login for ${username}`); // Log attempt
        const adminUser = await Admin.findOne({
          $or: [
            { username: username.toLowerCase() },
            { email: username.toLowerCase() },
          ],
        }).select("+password");

        if (!adminUser) {
          console.log("Local Strategy: Admin not found.");
          return done(null, false, { message: "Incorrect username or email." });
        }
        if (!adminUser.password) {
          console.error(
            `Local Strategy: Password field missing for admin ${adminUser.username}`
          );
          return done(null, false, {
            message: "Authentication configuration error.",
          });
        }

        const isMatch = await adminUser.matchPassword(password);
        if (!isMatch) {
          console.log(
            `Local Strategy: Incorrect password for ${adminUser.username}`
          );
          return done(null, false, { message: "Incorrect password." });
        }
        if (!adminUser.isActive) {
          console.log(
            `Local Strategy: Account inactive for ${adminUser.username}`
          );
          return done(null, false, { message: "Admin account is disabled." });
        }
        if (!adminUser.isMobileVerified) {
          console.log(
            `Local Strategy: Mobile not verified for ${adminUser.username}`
          );
          return done(null, false, { message: "Mobile number not verified." });
        }

        console.log(
          `Local Strategy: Login successful for ${adminUser.username}`
        );
        return done(null, adminUser);
      } catch (error) {
        console.error("Passport Admin Local Strategy Error:", error);
        return done(error);
      }
    }
  )
);

// --- Session Management (Serialization/Deserialization) ---
// ... (Unchanged) ...
passport.serializeUser((entity, done) => {
  if (entity instanceof User) {
    done(null, { id: entity.id, type: "User" });
  } else if (entity instanceof Admin) {
    done(null, { id: entity.id, type: "Admin" });
  } else {
    console.error("Serialization Error: Unknown entity type", entity);
    done(new Error("Cannot serialize unknown entity type"), null);
  }
});

passport.deserializeUser(async (sessionData, done) => {
  try {
    if (!sessionData || !sessionData.type || !sessionData.id) {
      throw new Error("Invalid session data format during deserialization.");
    }
    if (sessionData.type === "User") {
      if (typeof User?.findById !== "function")
        throw new Error("User model unavailable during deserialization.");
      const user = await User.findById(sessionData.id);
      done(null, user); // Attaches User doc to req.user, will be null if not found
    } else if (sessionData.type === "Admin") {
      if (typeof Admin?.findById !== "function")
        throw new Error("Admin model unavailable during deserialization.");
      const admin = await Admin.findById(sessionData.id);
      done(null, admin); // Attaches Admin doc to req.user, will be null if not found
    } else {
      throw new Error(
        `Cannot deserialize unknown entity type: ${sessionData.type}`
      );
    }
  } catch (err) {
    console.error("Error deserializing entity:", err);
    done(err, null);
  }
});

export default passport;

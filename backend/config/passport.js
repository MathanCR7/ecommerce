// backend/config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import dotenv from "dotenv";
import User from "../models/User.js";
import Admin from "../models/Admin.js"; // Assuming Admin model exists

dotenv.config();

// Path for the default avatar if served from the frontend's public assets
const DEFAULT_USER_PROFILE_PICTURE = "/assets/main-logo/default_avatar.png";

// --- Helper Function: Sanitize Username ---
const sanitizeUsername = (name) => {
  if (!name) return `user_${Date.now().toString(36).slice(-6)}`; // More unique default
  let sanitized = name
    .toLowerCase() // Standardize to lowercase
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, "") // Remove non-alphanumeric (except underscore)
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_+|_+$/g, ""); // Trim underscores from start/end

  if (!sanitized || sanitized.length < 3) {
    // Append random string if too short or empty after sanitization
    sanitized = `user_${sanitized}${Math.random()
      .toString(36)
      .substring(2, 7)}`;
  }
  return sanitized.slice(0, 30); // Max length 30
};

// --- Google OAuth Strategy (for Users) ---
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  passport.use(
    "google", // Strategy name
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        // passReqToCallback: true, // if you need access to req object in callback
      },
      async (accessToken, refreshToken, profile, done) => {
        const sessionEmail = profile.emails?.[0]?.value;
        const googleId = profile.id;

        console.log(
          `[Google Strategy] Auth attempt for Google ID: ${googleId}, Email: ${sessionEmail}`
        );

        if (!sessionEmail) {
          console.error("[Google Strategy] Email not found in Google profile.");
          return done(
            new Error("Email not available from Google profile."),
            false
          );
        }

        try {
          // Try to find user by Google ID first, then by email
          let user = await User.findOne({ googleId: googleId });

          if (!user) {
            // No user with this Google ID, check if email exists (manual account)
            user = await User.findOne({ email: sessionEmail.toLowerCase() });
            if (user) {
              // User exists with this email but no Google ID linked yet
              console.log(
                `[Google Strategy] Found existing user by email: ${sessionEmail}. Linking Google ID.`
              );
              user.googleId = googleId;
              // Optionally update displayName and profilePicture if not set or default
              if (!user.displayName || user.displayName === user.username) {
                user.displayName = profile.displayName || user.displayName;
              }
              if (
                (!user.profilePicture ||
                  user.profilePicture === DEFAULT_USER_PROFILE_PICTURE) &&
                profile.photos?.[0]?.value
              ) {
                user.profilePicture = profile.photos[0].value;
              }
            }
          }

          const now = new Date();

          if (user) {
            // User exists (either by googleId or email and now linked)
            console.log(
              `[Google Strategy] Processing existing user: ${user.email}`
            );
            let needsSave = false;

            // Ensure Google ID is set if it wasn't (e.g., manual account now linking Google)
            if (!user.googleId) {
              user.googleId = googleId;
              needsSave = true;
            }

            // Update display name if Google's is provided and current one is basic or different
            const googleDisplayName = profile.displayName;
            if (
              googleDisplayName &&
              (!user.displayName ||
                user.displayName === user.username ||
                user.displayName !== googleDisplayName)
            ) {
              user.displayName = googleDisplayName;
              needsSave = true;
            }

            // Update profile picture from Google if current is default or different
            const googlePic = profile.photos?.[0]?.value;
            if (googlePic) {
              // Only update if current picture is the default, or if Google's is different and not a manually uploaded one (heuristic)
              // This logic can be complex. Simpler: If Google provides a pic and it's different, update it.
              if (user.profilePicture !== googlePic) {
                // If user.profilePicture is a local path like "users/..." don't overwrite with googlePic unless explicitly desired.
                // For now, if it's default or truly different from another URL, update.
                if (
                  user.profilePicture === DEFAULT_USER_PROFILE_PICTURE ||
                  (user.profilePicture &&
                    !user.profilePicture.startsWith("users/"))
                ) {
                  user.profilePicture = googlePic;
                  needsSave = true;
                }
              }
            }

            if (user.recentLogin !== now) {
              // Check to avoid unnecessary save if only micro-seconds passed
              user.recentLogin = now;
              needsSave = true;
            }

            if (needsSave) {
              await user.save();
              console.log(`[Google Strategy] User ${user.email} updated.`);
            }
            return done(null, user);
          } else {
            // New user: Create one with Google details
            console.log(
              `[Google Strategy] Creating new user for email: ${sessionEmail}`
            );

            const emailPrefix = sessionEmail.split("@")[0];
            let potentialUsername = sanitizeUsername(emailPrefix);
            let usernameExists = await User.findOne({
              username: potentialUsername,
            });
            let attemptCount = 0;
            const MAX_USERNAME_ATTEMPTS = 5;

            while (usernameExists && attemptCount < MAX_USERNAME_ATTEMPTS) {
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
                "[Google Strategy] Could not generate unique username after multiple attempts."
              );
              return done(
                new Error(
                  "Failed to create a unique username. Please try again or contact support."
                ),
                false
              );
            }

            const newUser = new User({
              googleId: googleId,
              email: sessionEmail.toLowerCase(),
              username: potentialUsername,
              displayName: profile.displayName || potentialUsername, // Fallback to username if Google displayName is missing
              profilePicture:
                profile.photos?.[0]?.value || DEFAULT_USER_PROFILE_PICTURE,
              // Password is not set for Google-created users
              // Phone, DOB are not set here; frontend prompts if necessary
              isPhoneVerified: false, // Default
              recentLogin: now,
            });

            await newUser.save();
            console.log(
              `[Google Strategy] New user ${newUser.email} created successfully.`
            );
            return done(null, newUser);
          }
        } catch (err) {
          console.error("[Google Strategy] Error during authentication:", err);
          if (err.code === 11000) {
            // MongoDB duplicate key error
            // This can happen if, for example, two users try to sign up with the same email (if email is unique)
            // or if username generation conflict (less likely with good sanitization)
            let field = "details";
            if (err.message.includes("email")) field = "email address";
            if (err.message.includes("username")) field = "username";
            console.warn(`[Google Strategy] Duplicate key error for ${field}.`);
            return done(
              new Error(
                `An account with this ${field} might already exist or there was a conflict. Try logging in or contact support.`
              ),
              false
            );
          }
          return done(err, false); // Pass the original error for debugging
        }
      }
    )
  );
} else {
  console.warn(
    "[Passport Config] Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL) not fully configured. Google login for users will be disabled."
  );
}

// --- Local Strategy (for Admins) ---
// This remains largely the same as your provided version, assuming it's for a separate Admin login.
passport.use(
  "local-admin",
  new LocalStrategy(
    {
      usernameField: "username", // Field name for username/email in request body
      // passReqToCallback: true, // if you need req object
    },
    async (username, password, done) => {
      // async (req, username, password, done) => { // if passReqToCallback is true
      console.log(`[Admin Local Strategy] Login attempt for: ${username}`);
      try {
        if (typeof Admin?.findOne !== "function") {
          console.error(
            "[Admin Local Strategy] FATAL: Admin model not loaded or findOne is not a function."
          );
          return done(
            new Error("Server configuration error: Admin model issue."),
            null
          );
        }

        const adminIdentifier = username.toLowerCase();
        const admin = await Admin.findOne({
          $or: [{ username: adminIdentifier }, { email: adminIdentifier }],
        }).select("+password"); // Explicitly select password for comparison

        if (!admin) {
          console.log("[Admin Local Strategy] Admin not found.");
          return done(null, false, { message: "Invalid admin credentials." });
        }

        if (!admin.password) {
          console.error(
            `[Admin Local Strategy] Password field missing for admin ${admin.username}. Account might be improperly configured.`
          );
          return done(null, false, {
            message: "Admin account configuration error.",
          });
        }

        const isMatch = await admin.matchPassword(password); // Assumes Admin model has matchPassword method
        if (!isMatch) {
          console.log(
            `[Admin Local Strategy] Incorrect password for ${admin.username}.`
          );
          return done(null, false, { message: "Invalid admin credentials." });
        }

        // Additional checks for admin status (example)
        if (admin.isActive === false) {
          // Check if 'isActive' field exists on your Admin model
          console.log(
            `[Admin Local Strategy] Account inactive for ${admin.username}.`
          );
          return done(null, false, {
            message: "Admin account is currently disabled.",
          });
        }
        if (admin.isMobileVerified === false) {
          // Check if 'isMobileVerified' field exists
          console.log(
            `[Admin Local Strategy] Mobile not verified for ${admin.username}.`
          );
          return done(null, false, {
            message: "Admin mobile number not verified.",
          });
        }

        console.log(
          `[Admin Local Strategy] Login successful for ${admin.username}.`
        );
        return done(null, admin); // Authentication successful
      } catch (error) {
        console.error(
          "[Admin Local Strategy] Error during authentication:",
          error
        );
        return done(error); // Internal server error
      }
    }
  )
);

// --- Session Management: Serialization and Deserialization ---

// serializeUser: Determines what data from the user object should be stored in the session.
// Typically, only the user ID is stored to keep the session data small.
passport.serializeUser((entity, done) => {
  try {
    let sessionData = null;
    if (entity instanceof User) {
      sessionData = { id: entity.id, type: "User" };
    } else if (entity instanceof Admin) {
      sessionData = { id: entity.id, type: "Admin" };
    } else {
      console.error("[Passport Serialize] Unknown entity type:", entity);
      return done(new Error("Cannot serialize unknown entity type"), null);
    }
    // console.log('[Passport Serialize] Storing in session:', sessionData);
    done(null, sessionData);
  } catch (error) {
    console.error("[Passport Serialize] Error:", error);
    done(error, null);
  }
});

// deserializeUser: Retrieves the full user object from the database using the ID stored in the session.
// This object is then attached to `req.user`.
passport.deserializeUser(async (sessionData, done) => {
  try {
    // console.log('[Passport Deserialize] Retrieving from session:', sessionData);
    if (!sessionData || !sessionData.id || !sessionData.type) {
      // console.warn("[Passport Deserialize] Invalid or missing session data.");
      return done(null, false); // No user / invalid session
    }

    let entity = null;
    if (sessionData.type === "User") {
      if (typeof User?.findById !== "function") {
        throw new Error(
          "[Passport Deserialize] User model or findById method unavailable."
        );
      }
      entity = await User.findById(sessionData.id);
    } else if (sessionData.type === "Admin") {
      if (typeof Admin?.findById !== "function") {
        throw new Error(
          "[Passport Deserialize] Admin model or findById method unavailable."
        );
      }
      entity = await Admin.findById(sessionData.id);
    } else {
      console.error(
        "[Passport Deserialize] Unknown entity type in session data:",
        sessionData.type
      );
      return done(
        new Error(
          `Cannot deserialize unknown entity type: ${sessionData.type}`
        ),
        null
      );
    }

    if (!entity) {
      // console.warn(`[Passport Deserialize] ${sessionData.type} with ID ${sessionData.id} not found in DB.`);
      return done(null, false); // User/Admin not found in DB
    }

    // console.log(`[Passport Deserialize] ${sessionData.type} ${entity.id} attached to req.user.`);
    done(null, entity); // Attaches User/Admin document to req.user
  } catch (err) {
    console.error("[Passport Deserialize] Error:", err);
    done(err, null);
  }
});

export default passport;

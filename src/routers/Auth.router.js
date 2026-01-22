const express = require("express");
const { registerUser, loginUser } = require("../models/User.model");
const { verifyToken } = require("../middleware/auth.middleware");
const OAuthService = require("../services/oauth/OAuthService");
const {
  OAuthProviderError,
  OAuthCodeExchangeError,
  OAuthUserInfoError,
  OAuthStateMismatchError,
  OAuthConfigError,
  OAuthProviderNotSupportedError,
} = require("../services/oauth/OAuthErrors");
const router = express.Router();

// Helper function to get user from cookie token (for OAuth callbacks)
async function getUserFromCookie(req) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return null;
    }

    // Dynamic import for jose (ES Module)
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
    );

    const { payload } = await jwtVerify(token, secret);

    return {
      userId: payload.userId,
      email: payload.email,
      userRole: payload.userRole,
    };
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

// Initialize OAuth service
const oauthService = new OAuthService();

// Helper function to create JWT token
async function createToken(user) {
  // Dynamic import for ESM-only jose package
  const { SignJWT } = await import("jose");

  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "your-secret-key-change-in-production"
  );

  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    userRole: user.userRole,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Token expires in 7 days
    .sign(secret);

  return token;
}

// Register a new user
router.post("/register", (req, res, next) => {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required" });
  }

  // Validate password length (minimum 8 characters)
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters long" });
  }

  registerUser(name, email, password)
    .then((user) => res.status(201).json(user))
    .catch((error) => {
      // Handle unique constraint violation (duplicate email)
      if (error.code === "P2002" && error.meta?.target?.includes("email")) {
        return res.status(409).json({ error: "Email already exists" });
      }
      next(error);
    });
});

// Login a user
router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Verify credentials and get user
    const user = await loginUser(email, password);

    // Create JWT token
    const token = await createToken(user);

    // Set HTTP-only cookie with the token
    // This cookie will be automatically sent with all future requests
    res.cookie("token", token, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: "/", // Ensure cookie is available for all paths
    });

    // Return user data and token (token for client-side storage as fallback)
    res.status(200).json({
      user,
      token,
    });
  } catch (error) {
    // Handle authentication errors
    if (error.statusCode === 401) {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

// Logout a user
router.post("/logout", (req, res) => {
  // Clear the authentication cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/", // Must match the path used when setting the cookie
  });

  res.status(200).json({ message: "Logged out successfully" });
});

/**
 * GET /auth/google
 * Initiates Google OAuth flow
 * Redirects user to Google authorization page
 */
router.get("/google", (req, res, next) => {
  try {
    // Check if this is for account linking
    const isLinking = req.query.link === "true";
    if (isLinking) {
      // Store linking intent in cookie (expires in 10 minutes)
      res.cookie("oauth_link_intent", "google", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60 * 1000, // 10 minutes
        path: "/",
      });
    }

    const authorizationUrl = oauthService.initiateOAuth("google", req, res);
    res.redirect(authorizationUrl);
  } catch (error) {
    console.error("Google OAuth initiation error:", error);
    
    // Handle OAuth-specific errors
    let errorMessage = "Failed to initiate OAuth authentication";
    
    if (error instanceof OAuthConfigError) {
      errorMessage = "OAuth service is not properly configured. Please contact support.";
    } else if (error instanceof OAuthProviderNotSupportedError) {
      errorMessage = error.message;
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    return res.redirect(
      `/auth?error=${encodeURIComponent(errorMessage)}`
    );
  }
});

/**
 * GET /auth/facebook
 * Initiates Facebook OAuth flow
 * Redirects user to Facebook authorization page
 */
router.get("/facebook", (req, res, next) => {
  try {
    // Check if this is for account linking
    const isLinking = req.query.link === "true";
    if (isLinking) {
      // Store linking intent in cookie (expires in 10 minutes)
      res.cookie("oauth_link_intent", "facebook", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60 * 1000, // 10 minutes
        path: "/",
      });
    }

    const authorizationUrl = oauthService.initiateOAuth("facebook", req, res);
    res.redirect(authorizationUrl);
  } catch (error) {
    console.error("Facebook OAuth initiation error:", error);
    
    // Handle OAuth-specific errors
    let errorMessage = "Failed to initiate OAuth authentication";
    
    if (error instanceof OAuthConfigError) {
      errorMessage = "OAuth service is not properly configured. Please contact support.";
    } else if (error instanceof OAuthProviderNotSupportedError) {
      errorMessage = error.message;
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    return res.redirect(
      `/auth?error=${encodeURIComponent(errorMessage)}`
    );
  }
});

/**
 * GET /auth/google/callback
 * Handles Google OAuth callback
 * Completes OAuth flow and authenticates user
 */
router.get("/google/callback", async (req, res, next) => {
  try {
    const { code, state, error, link } = req.query;

    // Check for OAuth errors
    if (error) {
      return res.redirect(
        `/auth?error=${encodeURIComponent(
          error === "access_denied"
            ? "OAuth authorization was cancelled"
            : "OAuth authentication failed"
        )}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return res.redirect(
        `/auth?error=${encodeURIComponent("Invalid OAuth callback parameters")}`
      );
    }

    // Check if user is already logged in (for account linking)
    let loggedInUserId = null;
    const loggedInUser = await getUserFromCookie(req);
    if (loggedInUser && loggedInUser.userId) {
      loggedInUserId = loggedInUser.userId;
    }

    // Check if this is for account linking (from cookie or query param)
    const linkingIntent = req.cookies?.oauth_link_intent;
    const isLinking = link === "true" || linkingIntent === "google";

    // If user is logged in and this is for linking, get OAuth info and link
    if (loggedInUserId && isLinking) {
      // Clear the linking intent cookie
      res.clearCookie("oauth_link_intent", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      try {
        const oauthUserInfo = await oauthService.getOAuthUserInfo(
          "google",
          code,
          state,
          req,
          res
        );

        // Link OAuth account to logged-in user
        const linkedUser = await oauthService.linkAccount(
          loggedInUserId,
          oauthUserInfo,
          "google"
        );

        // Create/update JWT token
        const token = await createToken(linkedUser);

        // Set HTTP-only cookie
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        });

        // Redirect to home
        return res.redirect("/home");
      } catch (linkError) {
        console.error("Account linking error:", linkError);
        
        // Handle OAuth-specific errors
        let errorMessage = "Failed to link account";
        
        if (linkError instanceof OAuthStateMismatchError) {
          errorMessage = linkError.message;
        } else if (linkError instanceof OAuthCodeExchangeError) {
          errorMessage = "Failed to complete OAuth authentication. Please try again.";
        } else if (linkError instanceof OAuthUserInfoError) {
          errorMessage = "Failed to retrieve your account information. Please try again.";
        } else if (linkError instanceof OAuthConfigError) {
          errorMessage = "OAuth service is not properly configured. Please contact support.";
        } else if (linkError.message) {
          errorMessage = linkError.message;
        }
        
        return res.redirect(
          `/auth?error=${encodeURIComponent(errorMessage)}`
        );
      }
    }

    // Handle OAuth callback (normal flow)
    const result = await oauthService.handleCallback(
      "google",
      code,
      state,
      req,
      res
    );

    // Check if account linking is required
    if (result.accountLinkingRequired) {
      // Redirect to account linking page
      return res.redirect(
        `/auth?error=${encodeURIComponent(
          "An account with this email already exists. Please link your accounts."
        )}&linkingRequired=true&provider=google&email=${encodeURIComponent(
          result.existingUserEmail
        )}`
      );
    }

    // User is authenticated - create JWT token
    const token = await createToken(result.user);

    // Set HTTP-only cookie with the token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Clear timezone cookie after use
    res.clearCookie("user_timezone", {
      path: "/",
      sameSite: "lax",
    });

    // Redirect to home page
    res.redirect("/home");
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    
    // Handle OAuth-specific errors with appropriate messages
    let errorMessage = "OAuth authentication failed";
    
    if (error instanceof OAuthStateMismatchError) {
      errorMessage = error.message;
    } else if (error instanceof OAuthCodeExchangeError) {
      errorMessage = "Failed to complete OAuth authentication. Please try again.";
    } else if (error instanceof OAuthUserInfoError) {
      errorMessage = "Failed to retrieve your account information. Please try again.";
    } else if (error instanceof OAuthConfigError) {
      errorMessage = "OAuth service is not properly configured. Please contact support.";
    } else if (error instanceof OAuthProviderNotSupportedError) {
      errorMessage = error.message;
    } else if (error.statusCode) {
      // Handle errors with status codes
      errorMessage = error.message || errorMessage;
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    return res.redirect(
      `/auth?error=${encodeURIComponent(errorMessage)}`
    );
  }
});

/**
 * GET /auth/facebook/callback
 * Handles Facebook OAuth callback
 * Completes OAuth flow and authenticates user
 */
router.get("/facebook/callback", async (req, res, next) => {
  try {
    const { code, state, error, link } = req.query;

    // Check for OAuth errors
    if (error) {
      return res.redirect(
        `/auth?error=${encodeURIComponent(
          error === "access_denied"
            ? "OAuth authorization was cancelled"
            : "OAuth authentication failed"
        )}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return res.redirect(
        `/auth?error=${encodeURIComponent("Invalid OAuth callback parameters")}`
      );
    }

    // Check if user is already logged in (for account linking)
    let loggedInUserId = null;
    const loggedInUser = await getUserFromCookie(req);
    if (loggedInUser && loggedInUser.userId) {
      loggedInUserId = loggedInUser.userId;
    }

    // Check if this is for account linking (from cookie or query param)
    const linkingIntent = req.cookies?.oauth_link_intent;
    const isLinking = link === "true" || linkingIntent === "facebook";

    // If user is logged in and this is for linking, get OAuth info and link
    if (loggedInUserId && isLinking) {
      // Clear the linking intent cookie
      res.clearCookie("oauth_link_intent", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      try {
        const oauthUserInfo = await oauthService.getOAuthUserInfo(
          "facebook",
          code,
          state,
          req,
          res
        );

        // Link OAuth account to logged-in user
        const linkedUser = await oauthService.linkAccount(
          loggedInUserId,
          oauthUserInfo,
          "facebook"
        );

        // Create/update JWT token
        const token = await createToken(linkedUser);

        // Set HTTP-only cookie
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        });

        // Redirect to home
        return res.redirect("/home");
      } catch (linkError) {
        console.error("Account linking error:", linkError);
        
        // Handle OAuth-specific errors
        let errorMessage = "Failed to link account";
        
        if (linkError instanceof OAuthStateMismatchError) {
          errorMessage = linkError.message;
        } else if (linkError instanceof OAuthCodeExchangeError) {
          errorMessage = "Failed to complete OAuth authentication. Please try again.";
        } else if (linkError instanceof OAuthUserInfoError) {
          errorMessage = "Failed to retrieve your account information. Please try again.";
        } else if (linkError instanceof OAuthConfigError) {
          errorMessage = "OAuth service is not properly configured. Please contact support.";
        } else if (linkError.message) {
          errorMessage = linkError.message;
        }
        
        return res.redirect(
          `/auth?error=${encodeURIComponent(errorMessage)}`
        );
      }
    }

    // Handle OAuth callback (normal flow)
    const result = await oauthService.handleCallback(
      "facebook",
      code,
      state,
      req,
      res
    );

    // Check if account linking is required
    if (result.accountLinkingRequired) {
      // Redirect to account linking page
      return res.redirect(
        `/auth?error=${encodeURIComponent(
          "An account with this email already exists. Please link your accounts."
        )}&linkingRequired=true&provider=facebook&email=${encodeURIComponent(
          result.existingUserEmail
        )}`
      );
    }

    // User is authenticated - create JWT token
    const token = await createToken(result.user);

    // Set HTTP-only cookie with the token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Clear timezone cookie after use
    res.clearCookie("user_timezone", {
      path: "/",
      sameSite: "lax",
    });

    // Redirect to home page
    res.redirect("/home");
  } catch (error) {
    console.error("Facebook OAuth callback error:", error);
    return res.redirect(
      `/auth?error=${encodeURIComponent(
        error.message || "OAuth authentication failed"
      )}`
    );
  }
});

/**
 * POST /auth/link-account
 * Links OAuth account to existing email/password account
 * Requires authentication (user must be logged in)
 */
router.post("/link-account", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { provider, code, state } = req.body;

    // Validate required fields
    if (!provider || !code || !state) {
      return res.status(400).json({
        error: "Provider, code, and state are required for account linking",
      });
    }

    // Validate provider
    const normalizedProvider = provider.toLowerCase().trim();
    if (!["google", "facebook"].includes(normalizedProvider)) {
      return res.status(400).json({
        error: "Invalid OAuth provider. Supported: google, facebook",
      });
    }

    // Get OAuth user info without creating/finding user
    const oauthUserInfo = await oauthService.getOAuthUserInfo(
      normalizedProvider,
      code,
      state,
      req,
      res
    );

    // Link OAuth account to existing user
    const linkedUser = await oauthService.linkAccount(
      userId,
      oauthUserInfo,
      normalizedProvider
    );

    res.status(200).json({
      message: "Account linked successfully",
      user: linkedUser,
    });
  } catch (error) {
    console.error("Account linking error:", error);
    
    // Handle OAuth-specific errors
    if (error instanceof OAuthStateMismatchError) {
      return res.status(400).json({ error: error.message });
    } else if (error instanceof OAuthCodeExchangeError) {
      return res.status(400).json({ 
        error: "Failed to complete OAuth authentication. Please try again." 
      });
    } else if (error instanceof OAuthUserInfoError) {
      return res.status(400).json({ 
        error: "Failed to retrieve your account information. Please try again." 
      });
    } else if (error instanceof OAuthConfigError) {
      return res.status(500).json({ 
        error: "OAuth service is not properly configured. Please contact support." 
      });
    } else if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    } else if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    
    next(error);
  }
});

/**
 * GET /auth/check
 * Health check endpoint for authentication service
 * Returns 200 if auth service is operational
 */
router.get("/check", (req, res) => {
  res.status(200).json({
    success: true,
    service: "authentication",
    status: "operational",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

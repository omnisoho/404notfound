const createError = require("http-errors");

// Dynamic import for jose (ES Module) - cached for performance
let joseCache = null;

async function getJose() {
  if (!joseCache) {
    joseCache = await import("jose");
  }
  return joseCache;
}

/**
 * Middleware to verify JWT token and attach user info to request
 * Used for API routes that require authentication
 * Supports both Authorization header and cookie-based authentication (for OAuth users)
 */
async function verifyToken(req, res, next) {
  try {
    // Extract token from Authorization header or cookies
    let token = null;

    // Check Authorization header first (for API clients)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove "Bearer " prefix
    }

    // Fallback to cookies (for OAuth users with HTTP-only cookies)
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw createError(401, "No token provided");
    }

    // Verify token
    const jose = await getJose();
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
    );

    const { payload } = await jose.jwtVerify(token, secret);

    // Attach user info to request object
    req.user = {
      userId: payload.userId,
      email: payload.email,
      userRole: payload.userRole,
    };

    next();
  } catch (error) {
    if (error.code === "ERR_JWT_EXPIRED") {
      return next(createError(401, "Token has expired"));
    }
    if (error.code === "ERR_JWT_INVALID") {
      return next(createError(401, "Invalid token"));
    }
    if (error.statusCode === 401) {
      return next(error);
    }
    next(createError(401, "Authentication failed"));
  }
}

/**
 * Helper function to verify token without throwing errors
 * Returns the payload if valid, null otherwise
 */
async function verifyTokenSilent(token) {
  try {
    if (!token) return null;

    const jose = await getJose();
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
    );

    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to check if user is authenticated for page routes
 * Redirects to /auth if not authenticated
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for checking authentication and redirecting
 */
async function requireAuth(req, res, next) {
  try {
    // Extract token from cookies or Authorization header
    let token = null;

    // Check cookies first (primary method for browser requests)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Check Authorization header as fallback (for API requests)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    // Verify token
    const payload = await verifyTokenSilent(token);

    if (!payload) {
      // Token is invalid - clear cookie to prevent redirect loops
      if (req.cookies && req.cookies.token) {
        res.clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }
      // Not authenticated - redirect to auth page
      return res.redirect("/auth");
    }

    // Attach user info to request for downstream use
    req.user = {
      userId: payload.userId,
      email: payload.email,
      userRole: payload.userRole,
    };

    next();
  } catch (error) {
    // On any error, clear cookie and redirect to auth page
    if (req.cookies && req.cookies.token) {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }
    return res.redirect("/auth");
  }
}

/**
 * Middleware to check if user is already authenticated for auth pages
 * Redirects to /home if already authenticated
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for checking authentication and redirecting authenticated users
 */
async function redirectIfAuth(req, res, next) {
  try {
    // Extract token from cookies or Authorization header
    let token = null;

    // Check cookies first (primary method for browser requests)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Check Authorization header as fallback (for API requests)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    // Verify token
    const payload = await verifyTokenSilent(token);

    if (payload) {
      // Already authenticated - redirect to home
      return res.redirect("/home");
    }

    // Token is invalid or missing - clear any existing cookie to prevent loops
    if (req.cookies && req.cookies.token) {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    // Not authenticated - continue to auth page
    next();
  } catch (error) {
    // On error, clear cookie and continue to auth page
    if (req.cookies && req.cookies.token) {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }
    next();
  }
}

/**
 * Middleware to handle root route redirection based on auth status
 * Redirects authenticated users to /home, others stay on landing page
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for root route redirection logic
 */
async function handleRootRedirect(req, res, next) {
  try {
    // Extract token from cookies or Authorization header
    let token = null;

    // Debug: Log all cookies
    console.log("🔍 Root redirect - All cookies:", req.cookies);

    // Check cookies first (primary method for browser requests)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log("✅ Token found in cookies");
    } else {
      console.log("❌ No token in cookies");
    }

    // Check Authorization header as fallback (for API requests)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
        console.log("✅ Token found in Authorization header");
      }
    }

    // Verify token
    const payload = await verifyTokenSilent(token);

    if (payload) {
      // Authenticated - redirect to home
      console.log("✅ Token valid - Redirecting to /home");
      return res.redirect("/home");
    } else {
      console.log("❌ Token invalid or missing - Showing landing page");
      // Clear invalid cookie to prevent issues
      if (req.cookies && req.cookies.token) {
        res.clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }
    }

    // Not authenticated - continue to landing page
    next();
  } catch (error) {
    // On error, clear cookie and continue to landing page
    console.log("❌ Error in handleRootRedirect:", error.message);
    if (req.cookies && req.cookies.token) {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }
    next();
  }
}

/**
 * Middleware to verify JWT token and ensure user has admin role
 * Used for API routes that require admin access
 * Supports both Authorization header and cookie-based authentication
 * Returns 401 if not authenticated, 403 if not admin
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for verifying authentication and admin role
 */
async function requireAdmin(req, res, next) {
  try {
    // Extract token from Authorization header or cookies
    let token = null;

    // Check Authorization header first (for API clients)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove "Bearer " prefix
    }

    // Fallback to cookies (for OAuth users with HTTP-only cookies)
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw createError(401, "No token provided");
    }

    // Verify token
    const jose = await getJose();
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
    );

    const { payload } = await jose.jwtVerify(token, secret);

    // Check if user has admin role
    if (payload.userRole !== "admin") {
      throw createError(403, "Access denied. Admin privileges required.");
    }

    // Attach user info to request object
    req.user = {
      userId: payload.userId,
      email: payload.email,
      userRole: payload.userRole,
    };

    next();
  } catch (error) {
    if (error.code === "ERR_JWT_EXPIRED") {
      return next(createError(401, "Token has expired"));
    }
    if (error.code === "ERR_JWT_INVALID") {
      return next(createError(401, "Invalid token"));
    }
    if (error.statusCode === 401 || error.statusCode === 403) {
      return next(error);
    }
    next(createError(401, "Authentication failed"));
  }
}

/**
 * Middleware to enforce admin access for page routes
 * - Redirects unauthenticated users to /auth (same pattern as requireAuth)
 * - Redirects non-admin users to /auth instead of returning JSON
 */
async function requireAdminAuth(req, res, next) {
  try {
    // Extract token from cookies or Authorization header
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    const payload = await verifyTokenSilent(token);

    if (!payload) {
      if (req.cookies && req.cookies.token) {
        res.clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }
      return res.redirect("/auth");
    }

    if (payload.userRole !== "admin") {
      return res.redirect("/auth");
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
      userRole: payload.userRole,
    };

    next();
  } catch (error) {
    if (req.cookies && req.cookies.token) {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }
    return res.redirect("/auth");
  }
}

module.exports = {
  verifyToken,
  requireAuth,
  redirectIfAuth,
  handleRootRedirect,
  requireAdmin,
  requireAdminAuth,
};

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const argon2 = require("argon2");
const { sendPasswordResetEmail } = require("../utils/emailService");

const prisma = new PrismaClient();
const router = express.Router();

// Rate limiting tracking (in-memory for simplicity)
const rateLimitStore = {
  email: new Map(), // email -> { count, resetAt }
  ip: new Map(), // ip -> { count, resetAt }
};

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimits() {
  const now = Date.now();

  // Clean email rate limits
  for (const [key, value] of rateLimitStore.email.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.email.delete(key);
    }
  }

  // Clean IP rate limits
  for (const [key, value] of rateLimitStore.ip.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.ip.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

/**
 * Check rate limit for email (3 requests per hour)
 */
function checkEmailRateLimit(email) {
  const now = Date.now();
  const limit = 3;
  const windowMs = 60 * 60 * 1000; // 1 hour

  const record = rateLimitStore.email.get(email);

  if (!record) {
    rateLimitStore.email.set(email, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (now > record.resetAt) {
    // Window expired, reset
    rateLimitStore.email.set(email, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * Check rate limit for IP (5 requests per hour)
 */
function checkIpRateLimit(ip) {
  const now = Date.now();
  const limit = 5;
  const windowMs = 60 * 60 * 1000; // 1 hour

  const record = rateLimitStore.ip.get(ip);

  if (!record) {
    rateLimitStore.ip.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (now > record.resetAt) {
    // Window expired, reset
    rateLimitStore.ip.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * POST /api/auth/forgot-password
 * Request password reset - sends email with reset link
 *
 * Body:
 * - email: string (required)
 */
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      });
    }

    // Get client IP for rate limiting
    const clientIp = req.ip || req.connection.remoteAddress || "unknown";

    // Check rate limits
    const emailLimit = checkEmailRateLimit(email.toLowerCase());
    if (!emailLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: "Too many password reset requests. Please try again later.",
        retryAfter: emailLimit.retryAfter,
      });
    }

    const ipLimit = checkIpRateLimit(clientIp);
    if (!ipLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: "Too many password reset requests from this IP. Please try again later.",
        retryAfter: ipLimit.retryAfter,
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        authProvider: true,
      },
    });

    // Security: Always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link shortly.",
      });
    }

    // Block OAuth users from resetting password
    if (user.authProvider !== "email") {
      return res.status(400).json({
        success: false,
        error: `This account uses ${user.authProvider} authentication. Please sign in with ${user.authProvider} instead.`,
      });
    }

    // Generate secure random token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the token before storing (extra security layer)
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Set expiration to 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Delete any existing unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        used: false,
      },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
        ipAddress: clientIp,
      },
    });

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.name);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      return res.status(500).json({
        success: false,
        error: "Failed to send password reset email. Please try again later.",
      });
    }

    res.status(200).json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link shortly.",
    });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    next(error);
  }
});

/**
 * GET /api/auth/verify-reset-token/:token
 * Verify if reset token is valid and not expired
 *
 * Returns user info if token is valid
 */
router.get("/verify-reset-token/:token", async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token is required",
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Check if token exists
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    // Check if token has been used
    if (resetToken.used) {
      return res.status(400).json({
        success: false,
        error: "This reset link has already been used",
      });
    }

    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({
        success: false,
        error: "This reset link has expired. Please request a new one.",
      });
    }

    // Token is valid
    res.status(200).json({
      success: true,
      user: {
        email: resetToken.user.email,
        name: resetToken.user.name,
      },
    });
  } catch (error) {
    console.error("Error in verify-reset-token:", error);
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using valid token
 *
 * Body:
 * - token: string (required)
 * - newPassword: string (required)
 */
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Token and new password are required",
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters long",
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Check if token exists
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    // Check if token has been used
    if (resetToken.used) {
      return res.status(400).json({
        success: false,
        error: "This reset link has already been used",
      });
    }

    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({
        success: false,
        error: "This reset link has expired. Please request a new one.",
      });
    }

    // Hash the new password
    const passwordHash = await argon2.hash(newPassword);

    // Update user password and mark token as used
    await prisma.$transaction([
      // Update password
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      // Mark token as used
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    console.log(`✅ Password reset successful for user: ${resetToken.user.email}`);

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Error in reset-password:", error);
    next(error);
  }
});

module.exports = router;

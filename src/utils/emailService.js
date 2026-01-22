const nodemailer = require("nodemailer");

/**
 * Email Service for sending transactional emails
 * Uses Gmail SMTP with app-specific password
 */

// Create reusable transporter
let transporter = null;

/**
 * Initialize email transporter
 * Lazy initialization - only creates transporter when needed
 */
function getTransporter() {
  if (!transporter) {
    // Validate required environment variables
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error(
        "Email configuration missing. Please set SMTP_USER and SMTP_PASS environment variables."
      );
    }

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER, // Your Gmail address
        pass: process.env.SMTP_PASS, // App-specific password
      },
    });
  }

  return transporter;
}

/**
 * Send password reset email
 * @param {string} to - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name for personalization
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(to, resetToken, userName) {
  try {
    const transporter = getTransporter();

    // Build reset URL (frontend will handle the token)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"${process.env.APP_NAME || "Travel Planner"}" <${process.env.SMTP_USER}>`,
      to,
      subject: "Reset Your Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center;">
                      <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1e3a5f;">Reset Your Password</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 0 40px 40px;">
                      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #374151;">
                        Hi ${userName || "there"},
                      </p>

                      <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #374151;">
                        We received a request to reset your password. Click the button below to create a new password:
                      </p>

                      <!-- Reset Button -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td align="center" style="padding: 0 0 24px;">
                            <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1e3a5f; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Reset Password</a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280;">
                        Or copy and paste this link into your browser:
                      </p>

                      <p style="margin: 0 0 24px; padding: 12px; background-color: #f9fafb; border-radius: 4px; font-size: 14px; line-height: 20px; color: #6b7280; word-break: break-all;">
                        ${resetUrl}
                      </p>

                      <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280;">
                        This link will expire in <strong>15 minutes</strong> for security reasons.
                      </p>

                      <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                        If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; font-size: 12px; line-height: 16px; color: #9ca3af; text-align: center;">
                        This is an automated email from ${process.env.APP_NAME || "Travel Planner"}. Please do not reply to this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Hi ${userName || "there"},

We received a request to reset your password.

To reset your password, click this link or copy it into your browser:
${resetUrl}

This link will expire in 15 minutes for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

---
${process.env.APP_NAME || "Travel Planner"}
      `.trim(),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
}

/**
 * Verify email configuration is working
 * Use this to test the email service
 */
async function verifyEmailConfig() {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log("✅ Email service is ready to send emails");
    return true;
  } catch (error) {
    console.error("❌ Email service configuration error:", error);
    return false;
  }
}

module.exports = {
  sendPasswordResetEmail,
  verifyEmailConfig,
};

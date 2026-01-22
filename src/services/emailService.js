const nodemailer = require('nodemailer');

// Email configuration - update with your SMTP provider details
// For development, you can use ethereal.email for testing
// For production, use SendGrid, Mailgun, AWS SES, or your SMTP server

const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com', // Change to your SMTP host
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your SMTP username/email
    pass: process.env.SMTP_PASS  // Your SMTP password/app password
  }
};

// Create reusable transporter
let transporter = null;
let fromEmail = null;

async function getTransporter() {
  if (!transporter) {
    // If no SMTP credentials provided, use Ethereal for testing
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      fromEmail = testAccount.user;
      console.log('Using Ethereal test account. Preview emails at: https://ethereal.email');
    } else {
      transporter = nodemailer.createTransport(emailConfig);
      fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    }
  }
  return transporter;
}

/**
 * Send trip invitation email
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Recipient email
 * @param {string} params.inviterName - Name of person inviting
 * @param {string} params.tripName - Name of the trip
 * @param {string} params.tripStartDate - Trip start date
 * @param {string} params.tripEndDate - Trip end date
 * @param {string} params.token - Invitation token
 * @param {Date} params.expiresAt - Token expiry date
 * @returns {Promise<Object>} Email send result
 */
async function sendInvitationEmail({
  toEmail,
  inviterName,
  tripName,
  tripStartDate,
  tripEndDate,
  token,
  expiresAt
}) {
  const acceptUrl = `${process.env.APP_URL || 'http://localhost:3000'}/acceptInvitation.html?token=${token}`;
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const startDate = new Date(tripStartDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const endDate = new Date(tripEndDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #060606;
          background-color: #f3f1eb;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #fefdf9;
          border: 1px solid #dcd6c8;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .header {
          background: #1e3a5f;
          color: white;
          padding: 24px;
          border-radius: 12px;
          margin: -32px -32px 32px -32px;
        }
        h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
        }
        .trip-details {
          background: #f3f1eb;
          border-left: 4px solid #1e3a5f;
          padding: 16px;
          margin: 24px 0;
          border-radius: 4px;
        }
        .trip-details p {
          margin: 8px 0;
          color: #060606;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: #1e3a5f;
          color: white !important;
          text-decoration: none;
          border-radius: 8px;
          margin: 24px 0;
          font-weight: 600;
          transition: all 0.2s;
        }
        .button:hover {
          background: #2d4f7c;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(30, 58, 95, 0.2);
        }
        .expiry-notice {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          color: #92400e;
          padding: 14px;
          border-radius: 8px;
          margin-top: 24px;
          font-size: 14px;
        }
        .footer {
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #dcd6c8;
          font-size: 14px;
          color: #6d7177;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌍 Trip Invitation</h1>
        </div>
        
        <p>Hi there!</p>
        
        <p><strong>${inviterName}</strong> has invited you to join their trip on TravelBuddy.</p>
        
        <div class="trip-details">
          <p><strong>📍 Trip:</strong> ${tripName}</p>
          <p><strong>📅 Dates:</strong> ${startDate} - ${endDate}</p>
        </div>
        
        <p>Accept this invitation to:</p>
        <ul>
          <li>View the travel dashboard together</li>
          <li>Collaborate on trip planning</li>
          <li>Share itineraries and expenses</li>
          <li>Stay updated with trip activities</li>
        </ul>
        
        <center>
          <a href="${acceptUrl}" class="button">Accept Invitation</a>
        </center>
        
        <div class="expiry-notice">
          <strong>Note:</strong> This invitation expires on ${expiryDate}. Please accept before it expires.
        </div>
        
        <div class="footer">
          <p>If you don't have a TravelBuddy account, you'll need to register first before accepting the invitation.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          <p style="margin-top: 15px;">© ${new Date().getFullYear()} TravelBuddy. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Trip Invitation from ${inviterName}

${inviterName} has invited you to join their trip on TravelBuddy.

Trip: ${tripName}
Dates: ${startDate} - ${endDate}

Accept this invitation to view the travel dashboard together, collaborate on trip planning, and stay updated with trip activities.

Accept invitation: ${acceptUrl}

Note: This invitation expires on ${expiryDate}.

If you don't have a TravelBuddy account, you'll need to register first before accepting the invitation.

If you didn't expect this invitation, you can safely ignore this email.
  `.trim();

  const mailOptions = {
    from: `"TravelBuddy" <${fromEmail || 'noreply@travelbuddy.com'}>`,
    to: toEmail,
    subject: `You've been invited to "${tripName}" by ${inviterName}`,
    text: textContent,
    html: htmlContent
  };

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
}

/**
 * Send invitation accepted notification to trip owner
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Trip owner email
 * @param {string} params.acceptedUserName - Name of user who accepted
 * @param {string} params.tripName - Name of the trip
 * @returns {Promise<Object>} Email send result
 */
async function sendAcceptedNotificationEmail({ toEmail, acceptedUserName, tripName }) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #060606;
          background-color: #f3f1eb;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #fefdf9;
          border: 1px solid #dcd6c8;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .success-banner {
          background: #d1fae5;
          border: 1px solid #6ee7b7;
          color: #065f46;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-weight: 600;
        }
        h1 {
          font-family: 'Space Grotesk', sans-serif;
          color: #1e3a5f;
        }
        .footer {
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #dcd6c8;
          font-size: 14px;
          color: #6d7177;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-banner">
          <strong>Invitation Accepted!</strong>
        </div>
        
        <p>Great news!</p>
        
        <p><strong>${acceptedUserName}</strong> has accepted your invitation to join "${tripName}".</p>
        
        <p>You can now collaborate together on your trip planning!</p>
        
        <p>Best regards,<br>The TravelBuddy Team</p>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"TravelBuddy" <${fromEmail || 'noreply@travelbuddy.com'}>`,
    to: toEmail,
    subject: `${acceptedUserName} joined your trip "${tripName}"`,
    html: htmlContent
  };

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending acceptance notification:', error);
    throw error;
  }
}

/**
 * Verify email configuration (for testing)
 * @returns {Promise<boolean>} True if configuration is valid
 */
async function verifyEmailConfig() {
  try {
    const transporter = await getTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}

module.exports = {
  sendInvitationEmail,
  sendAcceptedNotificationEmail,
  verifyEmailConfig
};

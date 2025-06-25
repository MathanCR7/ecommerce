// backend/utils/emailService.js
import nodemailer from "nodemailer";

// --- Nodemailer Transporter Configuration ---
// Replace with your actual email service provider configuration
// For example, using ethereal.email for testing or your own SMTP server
let transporter;

if (
  process.env.EMAIL_HOST &&
  process.env.EMAIL_PORT &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS
) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_PORT === "465", // true for 465, false for other ports (e.g. 587 for TLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // tls: {
    //   // do not fail on invalid certs if using self-signed certificates (for development)
    //   rejectUnauthorized: process.env.NODE_ENV === 'production',
    // },
  });
  console.log("Nodemailer transporter configured.");
} else {
  console.warn(
    "Email service (Nodemailer) not fully configured. Password reset emails will be logged to console only."
  );
}

export const sendPasswordResetEmail = async (to, tempPassword) => {
  const mailOptions = {
    from:
      process.env.EMAIL_FROM || `"The FruitBowl & Co" <noreply@example.com>`,
    to: to,
    subject: "Your Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset the password for your account associated with this email address.</p>
        <p>Your temporary password is:</p>
        <p style="font-size: 1.2em; font-weight: bold; color: #333; background-color: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block;">
          ${tempPassword}
        </p>
        <p>Please log in using this temporary password and change it immediately from your profile settings for security reasons.</p>
        <p>If you did not request this password reset, please ignore this email or contact our support if you have concerns.</p>
        <hr>
        <p>Thank you,<br>The Team</p>
      </div>
    `,
  };

  if (!transporter) {
    console.log(
      "------- EMAIL SIMULATION (Email Service Not Configured) -------"
    );
    console.log(`To: ${to}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(
      `Body (HTML content not shown, plain text version): Your temporary password is: ${tempPassword}`
    );
    console.log("-----------------------------------------------------------");
    // Simulate success for development when no email service is set up
    return {
      success: true,
      message: "Email simulated to console as email service is not configured.",
    };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `Password reset email sent to ${to}. Message ID: ${info.messageId}`
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending password reset email to ${to}:`, error);
    // Do not throw error to client directly, handle it gracefully
    // The controller will send a generic success message to prevent account enumeration
    // But log it for server-side debugging
    return {
      success: false,
      error: "Could not send password reset email due to a server error.",
    };
  }
};

import { supabase } from "./supabase";

// Email template types
export type EmailTemplate =
  | "welcome"
  | "talentvisa_approved"
  | "talentvisa_rejected"
  | "observation_completed"
  | "endorsement_received"
  | "connection_request"
  | "connection_accepted"
  | "payment_released"
  | "project_milestone"
  | "training_completed"
  | "passport_issued";

// Email template configurations
const EMAIL_TEMPLATES: Record<
  EmailTemplate,
  {
    subject: string;
    getBody: (data: Record<string, any>) => string;
  }
> = {
  welcome: {
    subject: "Welcome to The 3rd Academy!",
    getBody: (data) => `
      <h2>Welcome, ${data.firstName}!</h2>
      <p>Thank you for joining The 3rd Academy platform. We're excited to help you on your journey to workplace readiness.</p>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Complete your profile</li>
        <li>Upload your resume</li>
        <li>Start your BridgeFast training</li>
        <li>Connect with mentors</li>
      </ul>
      <p>Best regards,<br>The 3rd Academy Team</p>
    `,
  },
  talentvisa_approved: {
    subject: "Congratulations! Your TalentVisa has been approved",
    getBody: (data) => `
      <h2>Your TalentVisa is Approved!</h2>
      <p>Dear ${data.firstName},</p>
      <p>Great news! Your TalentVisa nomination has been approved at the <strong>${data.tier}</strong> tier.</p>
      <p>This opens up premium opportunities for you on our platform, including:</p>
      <ul>
        <li>Priority visibility to employers</li>
        <li>Access to exclusive job opportunities</li>
        <li>Enhanced profile badge</li>
      </ul>
      <p>Congratulations on this achievement!</p>
      <p>Best regards,<br>The 3rd Academy Team</p>
    `,
  },
  talentvisa_rejected: {
    subject: "Update on your TalentVisa nomination",
    getBody: (data) => `
      <h2>TalentVisa Nomination Update</h2>
      <p>Dear ${data.firstName},</p>
      <p>Thank you for your TalentVisa nomination. After careful review, we've decided not to approve your nomination at this time.</p>
      <p>Don't be discouraged! Here are some ways to strengthen your next nomination:</p>
      <ul>
        <li>Complete more BridgeFast training modules</li>
        <li>Get additional mentor observations</li>
        <li>Work on LiveWorks projects to build experience</li>
      </ul>
      <p>You can be nominated again after 30 days.</p>
      <p>Best regards,<br>The 3rd Academy Team</p>
    `,
  },
  observation_completed: {
    subject: "New Mentor Observation Recorded",
    getBody: (data) => `
      <h2>Observation Completed</h2>
      <p>Dear ${data.firstName},</p>
      <p>Your mentor ${data.mentorName} has completed an observation session.</p>
      <p>Your current mentor loop count: <strong>${data.loopCount}/3</strong></p>
      ${data.loopCount >= 3 ? "<p>You're now eligible for your Skill Passport!</p>" : ""}
      <p>View the details in your Growth Log.</p>
      <p>Best regards,<br>The 3rd Academy Team</p>
    `,
  },
  endorsement_received: {
    subject: "You've received an endorsement!",
    getBody: (data) => `
      <h2>Endorsement Received</h2>
      <p>Dear ${data.firstName},</p>
      <p>Your mentor ${data.mentorName} has provided your endorsement: <strong>${data.decision}</strong></p>
      ${data.decision === "proceed" ? "<p>Congratulations! This is a great milestone in your journey.</p>" : ""}
      ${data.decision === "redirect" ? "<p>Your mentor suggests focusing on specific areas for improvement. Check your dashboard for details.</p>" : ""}
      <p>Best regards,<br>The 3rd Academy Team</p>
    `,
  },
  connection_request: {
    subject: "New Connection Request",
    getBody: (data) => `
      <h2>New Connection Request</h2>
      <p>Dear ${data.firstName},</p>
      <p>${data.employerName} from ${data.companyName} would like to connect with you!</p>
      <p>Message: "${data.message}"</p>
      <p>Log in to your dashboard to respond to this request.</p>
      <p>Best regards,<br>The 3rd Academy Team</p>
    `,
  },
  connection_accepted: {
    subject: "Connection Request Accepted",
    getBody: (data) => `
      <h2>Connection Accepted</h2>
      <p>Dear ${data.firstName},</p>
      <p>Great news! ${data.candidateName} has accepted your connection request.</p>
      <p>You can now:</p>
      <ul>
        <li>View their full profile</li>
        <li>Contact them directly</li>
        <li>Schedule interviews</li>
      </ul>
      <p>Best regards,<br>The 3rd Academy Team</p>
    `,
  },
  payment_released: {
    subject: "Payment Released - Milestone Completed",
    getBody: (data) => `
      <h2>Payment Released!</h2>
      <p>Dear ${data.firstName},</p>
      <p>Great news! The payment for your completed milestone has been released.</p>
      <p><strong>Project:</strong> ${data.projectTitle}</p>
      <p><strong>Milestone:</strong> ${data.milestoneTitle}</p>
      <p><strong>Amount:</strong> $${data.amount}</p>
      <p>The funds will be transferred to your account within 2-3 business days.</p>
      <p>Best regards,<br>The 3rd Academy Team</p>
    `,
  },
  project_milestone: {
    subject: "Project Milestone Update",
    getBody: (data) => `
      <h2>Milestone Update</h2>
      <p>Dear ${data.firstName},</p>
      <p>There's an update on your project milestone:</p>
      <p><strong>Project:</strong> ${data.projectTitle}</p>
      <p><strong>Milestone:</strong> ${data.milestoneTitle}</p>
      <p><strong>Status:</strong> ${data.status}</p>
      ${data.status === "approved" ? "<p>Congratulations on completing this milestone!</p>" : ""}
      <p>Best regards,<br>The 3rd Academy Team</p>
    `,
  },
  training_completed: {
    subject: "Training Module Completed",
    getBody: (data) => `
      <h2>Training Completed!</h2>
      <p>Dear ${data.firstName},</p>
      <p>Congratulations on completing the BridgeFast training module:</p>
      <p><strong>${data.moduleTitle}</strong></p>
      <p>Your score: <strong>${data.score}%</strong></p>
      <p>Your certificate is now available for download in your dashboard.</p>
      <p>Best regards,<br>The 3rd Academy Team</p>
    `,
  },
  passport_issued: {
    subject: "Your Skill Passport is Ready!",
    getBody: (data) => `
      <h2>Skill Passport Issued!</h2>
      <p>Dear ${data.firstName},</p>
      <p>Congratulations! Your Skill Passport has been issued.</p>
      <p><strong>Readiness Tier:</strong> ${data.tier}</p>
      <p><strong>Verification Code:</strong> ${data.verificationCode}</p>
      <p>You can now:</p>
      <ul>
        <li>Share your verified credential with employers</li>
        <li>Download your Skill Passport PDF</li>
        <li>Apply for positions on T3X Exchange</li>
      </ul>
      <p>Best regards,<br>The 3rd Academy Team</p>
    `,
  },
};

// Email queue entry
interface EmailQueueEntry {
  id?: string;
  to_email: string;
  to_name: string;
  template: EmailTemplate;
  template_data: Record<string, any>;
  status: "pending" | "sent" | "failed";
  created_at?: string;
  sent_at?: string;
  error_message?: string;
}

/**
 * Queue an email to be sent
 */
export async function queueEmail(
  toEmail: string,
  toName: string,
  template: EmailTemplate,
  templateData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Store email in queue (would be processed by a background worker or edge function)
    const { error } = await supabase.from("email_queue").insert({
      to_email: toEmail,
      to_name: toName,
      template,
      template_data: templateData,
      status: "pending",
    });

    if (error) {
      console.error("Failed to queue email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Error queueing email:", err);
    return { success: false, error: "Failed to queue email" };
  }
}

/**
 * Send an in-app notification with optional email
 */
export async function sendNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, any>,
  sendEmail?: boolean,
  emailTemplate?: EmailTemplate,
  emailData?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create in-app notification
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      metadata,
      is_read: false,
    });

    if (notifError) {
      console.error("Failed to create notification:", notifError);
      return { success: false, error: notifError.message };
    }

    // If email should be sent, queue it
    if (sendEmail && emailTemplate && emailData) {
      // Get user email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name, last_name")
        .eq("id", userId)
        .single();

      if (profile) {
        await queueEmail(
          profile.email,
          `${profile.first_name} ${profile.last_name}`,
          emailTemplate,
          { ...emailData, firstName: profile.first_name }
        );
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Error sending notification:", err);
    return { success: false, error: "Failed to send notification" };
  }
}

/**
 * Get email HTML from template
 */
export function getEmailHtml(template: EmailTemplate, data: Record<string, any>): string {
  const templateConfig = EMAIL_TEMPLATES[template];
  if (!templateConfig) {
    return `<p>Unknown template: ${template}</p>`;
  }

  const body = templateConfig.getBody(data);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${templateConfig.subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        h2 {
          color: #1e3a5f;
          border-bottom: 2px solid #10b981;
          padding-bottom: 10px;
        }
        ul {
          padding-left: 20px;
        }
        li {
          margin-bottom: 8px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
        }
        strong {
          color: #1e3a5f;
        }
      </style>
    </head>
    <body>
      ${body}
      <div class="footer">
        <p>This email was sent by The 3rd Academy. If you have questions, please contact support.</p>
        <p>&copy; ${new Date().getFullYear()} The 3rd Academy. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Get email subject from template
 */
export function getEmailSubject(template: EmailTemplate): string {
  return EMAIL_TEMPLATES[template]?.subject || "Notification from The 3rd Academy";
}

// Convenience functions for common notifications
export const NotificationService = {
  // Welcome new user
  welcomeUser: async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("id", userId)
      .single();

    if (profile) {
      return sendNotification(
        userId,
        "welcome",
        "Welcome to The 3rd Academy!",
        "We're excited to help you on your journey to workplace readiness.",
        {},
        true,
        "welcome",
        { firstName: profile.first_name }
      );
    }
    return { success: false, error: "Profile not found" };
  },

  // TalentVisa approved
  talentVisaApproved: async (userId: string, tier: string) => {
    return sendNotification(
      userId,
      "talentvisa_approved",
      `TalentVisa ${tier} Approved!`,
      `Congratulations! You've been awarded a ${tier} TalentVisa.`,
      { tier },
      true,
      "talentvisa_approved",
      { tier }
    );
  },

  // Observation completed
  observationCompleted: async (userId: string, mentorName: string, loopCount: number) => {
    return sendNotification(
      userId,
      "observation",
      "Mentor Observation Completed",
      `Your mentor ${mentorName} has completed an observation. Loop count: ${loopCount}/3`,
      { mentorName, loopCount },
      true,
      "observation_completed",
      { mentorName, loopCount }
    );
  },

  // Payment released
  paymentReleased: async (
    userId: string,
    projectTitle: string,
    milestoneTitle: string,
    amount: number
  ) => {
    return sendNotification(
      userId,
      "payment",
      "Payment Released!",
      `Payment of $${amount} for "${milestoneTitle}" has been released.`,
      { projectTitle, milestoneTitle, amount },
      true,
      "payment_released",
      { projectTitle, milestoneTitle, amount }
    );
  },

  // Connection request
  connectionRequest: async (
    candidateId: string,
    employerName: string,
    companyName: string,
    message: string
  ) => {
    return sendNotification(
      candidateId,
      "connection",
      "New Connection Request",
      `${employerName} from ${companyName} wants to connect with you.`,
      { employerName, companyName, message },
      true,
      "connection_request",
      { employerName, companyName, message }
    );
  },

  // Training completed
  trainingCompleted: async (userId: string, moduleTitle: string, score: number) => {
    return sendNotification(
      userId,
      "training",
      "Training Module Completed!",
      `Congratulations on completing "${moduleTitle}" with a score of ${score}%!`,
      { moduleTitle, score },
      true,
      "training_completed",
      { moduleTitle, score }
    );
  },

  // Passport issued
  passportIssued: async (userId: string, tier: string, verificationCode: string) => {
    return sendNotification(
      userId,
      "passport",
      "Skill Passport Issued!",
      `Your Skill Passport is ready! Tier: ${tier}`,
      { tier, verificationCode },
      true,
      "passport_issued",
      { tier, verificationCode }
    );
  },
};

export default NotificationService;

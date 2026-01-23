import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourdomain.com'
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'aaron@salesmonsters.com'
const APP_NAME = 'SEO Dashboard'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export class EmailService {
  static async sendEmail({ to, subject, html, text }: SendEmailOptions) {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email')
      return { success: false, error: 'Email not configured' }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: `${APP_NAME} <${FROM_EMAIL}>`,
        replyTo: REPLY_TO_EMAIL,
        to,
        subject,
        html,
        text,
      })

      if (error) {
        console.error('Failed to send email:', error)
        return { success: false, error: error.message }
      }

      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('Email service error:', error)
      return { success: false, error: 'Failed to send email' }
    }
  }

  static async sendPasswordResetEmail(email: string, resetLink: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #111827; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #6b7280;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #22c55e; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              This email was sent by ${APP_NAME}. If you have any questions, please contact support.
            </p>
          </div>
        </body>
      </html>
    `

    const text = `
Reset Your Password

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.

- ${APP_NAME}
    `.trim()

    return this.sendEmail({
      to: email,
      subject: `Reset your ${APP_NAME} password`,
      html,
      text,
    })
  }

  static async sendWelcomeEmail(email: string, name?: string) {
    const greeting = name ? `Hi ${name}` : 'Welcome'

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${APP_NAME}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #111827; margin-top: 0;">${greeting}!</h2>
            <p style="color: #6b7280;">
              Thanks for signing up for ${APP_NAME}. We're excited to have you on board!
            </p>
            <p style="color: #6b7280;">
              With ${APP_NAME}, you can:
            </p>
            <ul style="color: #6b7280;">
              <li>Track your Google Analytics metrics</li>
              <li>Monitor Search Console performance</li>
              <li>Analyze YouTube channel stats</li>
              <li>View all your data in one dashboard</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="background: #22c55e; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              This email was sent by ${APP_NAME}. If you have any questions, please contact support.
            </p>
          </div>
        </body>
      </html>
    `

    const text = `
${greeting}!

Thanks for signing up for ${APP_NAME}. We're excited to have you on board!

With ${APP_NAME}, you can:
- Track your Google Analytics metrics
- Monitor Search Console performance
- Analyze YouTube channel stats
- View all your data in one dashboard

Get started: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard

- The ${APP_NAME} Team
    `.trim()

    return this.sendEmail({
      to: email,
      subject: `Welcome to ${APP_NAME}!`,
      html,
      text,
    })
  }
}

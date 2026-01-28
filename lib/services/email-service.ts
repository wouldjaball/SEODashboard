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

  static async sendInviteEmail(
    email: string,
    companyNames: string | string[],
    inviterName?: string,
    temporaryPassword?: string
  ) {
    const invitedBy = inviterName ? ` by ${inviterName}` : ''
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Support both single company name and array of company names
    const names = Array.isArray(companyNames) ? companyNames : [companyNames]

    // Format company list for display
    let companyList: string
    if (names.length === 1) {
      companyList = names[0]
    } else if (names.length === 2) {
      companyList = `${names[0]} and ${names[1]}`
    } else {
      companyList = names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1]
    }

    // Create a bulleted list for multiple companies
    const companyBullets = names.length > 1
      ? `<ul style="color: #6b7280; margin: 10px 0;">${names.map(n => `<li><strong>${n}</strong></li>`).join('')}</ul>`
      : ''

    const companyTextBullets = names.length > 1
      ? '\n' + names.map(n => `  • ${n}`).join('\n') + '\n'
      : ''

    // Password section for email (only if temporary password provided)
    const passwordHtml = temporaryPassword ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0 0 8px 0; font-weight: 600;">Your Login Credentials</p>
              <p style="color: #78350f; margin: 0 0 4px 0;">Email: <strong>${email}</strong></p>
              <p style="color: #78350f; margin: 0 0 12px 0;">Temporary Password: <strong style="font-family: monospace; background: #fff; padding: 2px 6px; border-radius: 3px;">${temporaryPassword}</strong></p>
              <p style="color: #b45309; margin: 0; font-size: 13px;">You will be required to change this password on your first login.</p>
            </div>
    ` : ''

    const passwordText = temporaryPassword ? `

YOUR LOGIN CREDENTIALS:
Email: ${email}
Temporary Password: ${temporaryPassword}

IMPORTANT: You will be required to change this password on your first login.
` : ''

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You've Been Invited to ${APP_NAME}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #111827; margin-top: 0;">You've Been Invited!</h2>
            <p style="color: #6b7280;">
              You've been invited${invitedBy} to join ${names.length === 1 ? `<strong>${companyList}</strong>` : 'the following companies'} on ${APP_NAME}${names.length > 1 ? ':' : '.'}
            </p>
            ${companyBullets}
            ${passwordHtml}
            <p style="color: #6b7280;">
              ${temporaryPassword ? 'Click the button below to log in and access your dashboard' : 'Click the button below to sign up and get access to your dashboard'}${names.length > 1 ? 's' : ''}.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/auth/login" style="background: #22c55e; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                ${temporaryPassword ? 'Log In Now' : 'Accept Invitation'}
              </a>
            </div>
            ${!temporaryPassword ? `
            <p style="color: #6b7280; font-size: 14px;">
              Once you sign up with this email address (${email}), you'll automatically have access to ${names.length === 1 ? companyList : 'all ' + names.length + ' companies'}.
            </p>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              This email was sent by ${APP_NAME}. If you weren't expecting this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `

    const text = `
You've Been Invited to ${APP_NAME}!

You've been invited${invitedBy} to join ${names.length === 1 ? companyList : 'the following companies'} on ${APP_NAME}:
${companyTextBullets}${passwordText}
Click here to ${temporaryPassword ? 'log in' : 'sign up'} and get access: ${appUrl}/auth/login

${!temporaryPassword ? `Once you sign up with this email address (${email}), you'll automatically have access to ${names.length === 1 ? companyList : 'all ' + names.length + ' companies'}.` : ''}

- The ${APP_NAME} Team
    `.trim()

    // Use appropriate subject line based on number of companies
    const subject = names.length === 1
      ? `You've been invited to join ${companyList} on ${APP_NAME}`
      : `You've been invited to join ${names.length} companies on ${APP_NAME}`

    return this.sendEmail({
      to: email,
      subject,
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

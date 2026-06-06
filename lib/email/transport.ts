import nodemailer from "nodemailer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"

export type SiteSmtpConfig = {
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPass: string | null
  smtpFrom: string | null
}

/**
 * Build a Nodemailer transporter from per-site SMTP config.
 * Returns null if required credentials are missing — callers skip email silently.
 */
export function buildTransporter(site: SiteSmtpConfig) {
  const { smtpHost, smtpUser, smtpPass } = site
  if (!smtpHost || !smtpUser || !smtpPass) return null

  const port = site.smtpPort ?? 465
  return nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    logger: true, // Enable logging for debugging purposes.
    debug: true, // Enable debug output for troubleshooting.
  } as SMTPTransport.Options)
}

export function getFromAddress(site: SiteSmtpConfig): string {
  if (site.smtpFrom) return site.smtpFrom
  // Fall back to smtpUser when it's an email (standard SMTP setups where auth user = sender)
  if (site.smtpUser && site.smtpUser.includes("@")) return site.smtpUser
  return "noreply@example.com"
}

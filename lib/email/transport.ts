import nodemailer from "nodemailer"

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
  })
}

export function getFromAddress(site: SiteSmtpConfig): string {
  return site.smtpFrom ?? "noreply@example.com"
}

// lib/email/transport.ts
import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"

let _transporter: Transporter | null = null

export function getTransporter(): Transporter | null {
  if (_transporter) return _transporter

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  const port = parseInt(process.env.SMTP_PORT ?? "465", 10)
  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
  return _transporter
}

export function getFromAddress(): string {
  return process.env.SMTP_FROM ?? "noreply@example.com"
}

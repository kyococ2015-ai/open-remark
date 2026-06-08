import { Button, Heading, Text } from "@react-email/components"
import { EmailLayout } from "./layout"

type Props = {
  replierName: string
  pageTitle: string
  originalBody: string
  replyBody: string
  viewUrl: string
  accentColor: string
  logoUrl?: string | null
  footerText: string
  siteUrl?: string | null
  unsubscribeUrl: string
}

export function ReplyEmail({
  replierName,
  pageTitle,
  originalBody,
  replyBody,
  viewUrl,
  accentColor,
  logoUrl,
  footerText,
  siteUrl,
  unsubscribeUrl,
}: Props) {
  return (
    <EmailLayout
      preview={`${replierName} replied to your comment on "${pageTitle}"`}
      accentColor={accentColor}
      logoUrl={logoUrl}
      footerText={footerText}
      siteUrl={siteUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading
        style={{
          fontSize: "18px",
          fontWeight: "600",
          margin: "0 0 12px",
          color: "#111827",
        }}
      >
        Someone replied to your comment
      </Heading>
      <Text style={{ color: "#9ca3af", margin: "0 0 6px", fontSize: "13px" }}>
        Your comment on &ldquo;{pageTitle}&rdquo;:
      </Text>
      <Text
        style={{
          backgroundColor: "#f9fafb",
          borderLeft: "3px solid #d1d5db",
          padding: "10px 14px",
          margin: "0 0 14px",
          fontSize: "13px",
          color: "#6b7280",
          borderRadius: "0 4px 4px 0",
        }}
      >
        {originalBody}
      </Text>
      <Text style={{ color: "#6b7280", margin: "0 0 8px", fontSize: "13px" }}>
        <strong style={{ color: "#374151" }}>{replierName}</strong> replied:
      </Text>
      <Text
        style={{
          backgroundColor: "#f9fafb",
          borderLeft: `3px solid ${accentColor}`,
          padding: "10px 14px",
          margin: "0 0 20px",
          fontSize: "14px",
          color: "#374151",
          borderRadius: "0 4px 4px 0",
        }}
      >
        {replyBody}
      </Text>
      <Button
        href={viewUrl}
        style={{
          backgroundColor: accentColor,
          color: "#ffffff",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: "600",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        View Reply
      </Button>
    </EmailLayout>
  )
}

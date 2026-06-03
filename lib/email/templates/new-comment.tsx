import { Button, Heading, Text } from "@react-email/components"
import { EmailLayout } from "./layout"

type Props = {
  commenterName: string
  pageTitle: string
  commentBody: string
  viewUrl: string
  accentColor: string
  logoUrl?: string | null
  footerText: string
  siteUrl?: string | null
}

export function NewCommentEmail({
  commenterName,
  pageTitle,
  commentBody,
  viewUrl,
  accentColor,
  logoUrl,
  footerText,
  siteUrl,
}: Props) {
  return (
    <EmailLayout
      preview={`${commenterName} commented on "${pageTitle}"`}
      accentColor={accentColor}
      logoUrl={logoUrl}
      footerText={footerText}
      siteUrl={siteUrl}
    >
      <Heading
        style={{
          fontSize: "18px",
          fontWeight: "600",
          margin: "0 0 8px",
          color: "#111827",
        }}
      >
        New comment on &ldquo;{pageTitle}&rdquo;
      </Heading>
      <Text style={{ color: "#6b7280", margin: "0 0 16px", fontSize: "14px" }}>
        <strong style={{ color: "#374151" }}>{commenterName}</strong> left a
        comment:
      </Text>
      <Text
        style={{
          backgroundColor: "#f9fafb",
          borderLeft: `3px solid ${accentColor}`,
          padding: "12px 16px",
          margin: "0 0 20px",
          fontSize: "14px",
          color: "#374151",
          borderRadius: "0 4px 4px 0",
        }}
      >
        {commentBody}
      </Text>
      <Button
        href={viewUrl}
        style={{
          backgroundColor: accentColor,
          color: "#ffffff",
          padding: "10px 20px",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: "600",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        View Comment
      </Button>
    </EmailLayout>
  )
}

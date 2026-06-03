import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components"

type Props = {
  preview: string
  accentColor: string
  logoUrl?: string | null
  footerText: string
  siteUrl?: string | null
  unsubscribeUrl?: string | null
  children: React.ReactNode
}

export function EmailLayout({
  preview,
  accentColor,
  logoUrl,
  footerText,
  siteUrl,
  unsubscribeUrl,
  children,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#f6f9fc",
          fontFamily: "sans-serif",
          margin: 0,
        }}
      >
        <Container
          style={{ maxWidth: "580px", margin: "0 auto", padding: "20px 0" }}
        >
          {logoUrl && (
            <Section style={{ padding: "20px 24px 0" }}>
              {siteUrl ? (
                <Link href={siteUrl}>
                  <Img src={logoUrl} height={32} alt="Logo" />
                </Link>
              ) : (
                <Img src={logoUrl} height={32} alt="Logo" />
              )}
            </Section>
          )}

          <Section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "24px",
              margin: "16px 0",
              borderTop: `3px solid ${accentColor}`,
            }}
          >
            {children}
          </Section>

          <Section style={{ padding: "0 24px" }}>
            <Hr style={{ borderColor: "#e5e7eb" }} />
            <Text
              style={{
                color: "#9ca3af",
                fontSize: "12px",
                lineHeight: "1.6",
                margin: "8px 0 0",
              }}
            >
              {footerText}
              {unsubscribeUrl && (
                <>
                  {" · "}
                  <Link href={unsubscribeUrl} style={{ color: "#9ca3af" }}>
                    Unsubscribe
                  </Link>
                </>
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

import { render } from "@react-email/render"
import { NewCommentEmail } from "./templates/new-comment"
import { ReplyEmail } from "./templates/reply"
import { getTransporter, getFromAddress } from "./transport"
import appConfig from "@/config/config.json"

type SiteEmailConfig = {
  domain: string
  emailNotificationsEnabled: boolean
  emailSubjectPrefix: string | null
  emailLogoUrl: string | null
  emailAccentColor: string | null
  emailFooterText: string | null
}

type CommenterInfo = {
  name: string
  email: string
  notificationsEnabled: boolean
  notificationToken: string
}

type CommentInfo = { id: string; body: string }
type PageInfo = { slug: string; url: string | null }

function resolveConfig(site: SiteEmailConfig) {
  const ec = appConfig.email
  return {
    subjectPrefix: site.emailSubjectPrefix ?? ec.defaultSubjectPrefix,
    accentColor: site.emailAccentColor ?? ec.defaultAccentColor,
    footerText: site.emailFooterText ?? ec.defaultFooterText,
    fromName: ec.fromName,
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function buildCommentUrl(
  site: SiteEmailConfig,
  page: PageInfo,
  commentId: string
): string {
  const base = page.url ?? `https://${site.domain}/${page.slug}`
  return `${base}#comment-${commentId}`
}

export async function notifyNewComment(
  comment: CommentInfo,
  commenter: { name: string },
  page: PageInfo,
  site: SiteEmailConfig,
  owner: { email: string }
): Promise<void> {
  if (!site.emailNotificationsEnabled) return
  const transport = getTransporter()
  if (!transport) return

  try {
    const { subjectPrefix, accentColor, footerText, fromName } =
      resolveConfig(site)
    const pageTitle = page.slug

    const html = await render(
      NewCommentEmail({
        commenterName: commenter.name,
        pageTitle,
        commentBody: truncate(comment.body, 200),
        viewUrl: buildCommentUrl(site, page, comment.id),
        accentColor,
        logoUrl: site.emailLogoUrl,
        footerText,
        siteUrl: `https://${site.domain}`,
      })
    )

    await transport.sendMail({
      from: `"${fromName}" <${getFromAddress()}>`,
      to: owner.email,
      subject: `${subjectPrefix} ${commenter.name} commented on "${pageTitle}"`,
      html,
    })
  } catch (err) {
    console.error("[email] notifyNewComment failed:", err)
  }
}

export async function notifyReply(
  reply: CommentInfo,
  replier: { name: string },
  parentComment: CommentInfo,
  parentCommenter: CommenterInfo,
  page: PageInfo,
  site: SiteEmailConfig
): Promise<void> {
  if (!site.emailNotificationsEnabled) return
  if (!parentCommenter.notificationsEnabled) return
  const transport = getTransporter()
  if (!transport) return

  try {
    const { subjectPrefix, accentColor, footerText, fromName } =
      resolveConfig(site)
    const pageTitle = page.slug
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${parentCommenter.notificationToken}`

    const html = await render(
      ReplyEmail({
        replierName: replier.name,
        pageTitle,
        originalBody: truncate(parentComment.body, 150),
        replyBody: truncate(reply.body, 200),
        viewUrl: buildCommentUrl(site, page, reply.id),
        accentColor,
        logoUrl: site.emailLogoUrl,
        footerText,
        siteUrl: `https://${site.domain}`,
        unsubscribeUrl,
      })
    )

    await transport.sendMail({
      from: `"${fromName}" <${getFromAddress()}>`,
      to: parentCommenter.email,
      subject: `${subjectPrefix} Someone replied to your comment on "${pageTitle}"`,
      html,
    })
  } catch (err) {
    console.error("[email] notifyReply failed:", err)
  }
}

export async function previewTemplate(
  type: "new-comment" | "reply",
  site: SiteEmailConfig
): Promise<string> {
  const { accentColor, footerText } = resolveConfig(site)
  const siteUrl = `https://${site.domain}`

  if (type === "new-comment") {
    return render(
      NewCommentEmail({
        commenterName: "Jane Smith",
        pageTitle: "getting-started",
        commentBody:
          "This is a great tool! I've been looking for something like this for a while.",
        viewUrl: siteUrl,
        accentColor,
        logoUrl: site.emailLogoUrl,
        footerText,
        siteUrl,
      })
    )
  }

  return render(
    ReplyEmail({
      replierName: "John Doe",
      pageTitle: "getting-started",
      originalBody:
        "This is a great tool! I've been looking for something like this for a while.",
      replyBody: "Totally agree! The setup was really simple too.",
      viewUrl: siteUrl,
      accentColor,
      logoUrl: site.emailLogoUrl,
      footerText,
      siteUrl,
      unsubscribeUrl: "#",
    })
  )
}

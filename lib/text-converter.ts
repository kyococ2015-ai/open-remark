import { slug } from "github-slugger"
import { marked } from "marked"

// slugify
export const slugify = (content: string) => {
  return slug(content)
}

// markdownify
export const markdownify = (content: string, div?: boolean) => {
  const markdownContent = div
    ? (marked.parse(content) as string)
    : (marked.parseInline(content) as string)
  return { __html: markdownContent }
}

// humanize
export const humanize = (content: string) => {
  return content
    .replace(/^[\s_]+|[\s_]+$/g, "")
    .replace(/[_\s]+/g, " ")
    .replace(/^[a-z]/, (m) => m.toUpperCase())
}

// titleify
export const titleify = (content: string) => {
  const humanized = humanize(content)
  return humanized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// plainify
export const plainify = (content: string) => {
  const parsedMarkdown = marked.parse(content) as string
  const filterBrackets = parsedMarkdown.replace(/<\/?[^>]+(>|$)/gm, "")
  const filterSpaces = filterBrackets.replace(/[\r\n]\s*[\r\n]/gm, "")
  return decodeHtmlEntities(filterSpaces)
}

// strip entities for plainify
const htmlEntities: Record<string, string> = {
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
}

const decodeHtmlEntities = (htmlWithEntities: string): string => {
  return htmlWithEntities.replace(
    /(&amp;|&lt;|&gt;|&quot;|&#39;)/g,
    (entity: string): string => htmlEntities[entity]
  )
}

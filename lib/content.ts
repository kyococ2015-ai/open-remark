import fs from "fs"
import path from "path"
import matter from "gray-matter"

const contentPath = path.join(process.cwd(), "content")

export function getListPage(filePath: string) {
  const fullPath = path.join(contentPath, filePath)
  const raw = fs.readFileSync(fullPath, "utf-8")
  const { content, data: frontmatter } = matter(raw)
  return { frontmatter, content }
}

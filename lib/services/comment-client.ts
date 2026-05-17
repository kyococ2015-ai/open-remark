export type ClientCommentStatus = "APPROVED" | "PENDING" | "SPAM" | "DELETED"

export async function patchCommentStatus(
  id: string,
  status: ClientCommentStatus
) {
  const res = await fetch(`/api/v1/comments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error("Failed to update comment status")
}

export async function patchCommentBody(id: string, body: string) {
  const res = await fetch(`/api/v1/comments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  })
  if (!res.ok) throw new Error("Failed to update comment body")
}

export async function banCommenter(siteId: string, commenterId: string) {
  const res = await fetch(`/api/v1/sites/${siteId}/users/${commenterId}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "ban" }),
  })
  if (!res.ok) throw new Error("Failed to ban user")
  return res.json()
}

export async function deleteAllCommentsByCommenter(
  siteId: string,
  commenterId: string
) {
  const res = await fetch(`/api/v1/sites/${siteId}/users/${commenterId}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "deleteAll" }),
  })
  if (!res.ok) throw new Error("Failed to delete all comments")
  return res.json()
}

export async function unbanCommenter(siteId: string, commenterId: string) {
  const res = await fetch(`/api/v1/sites/${siteId}/users/${commenterId}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "unban" }),
  })
  if (!res.ok) throw new Error("Failed to remove ban")
  return res.json()
}

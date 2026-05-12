import type { CommentData, WidgetThemeConfig } from "./types";

export async function fetchComments(
  appUrl: string,
  siteKey: string,
  slug: string,
  token?: string,
): Promise<{ comments: CommentData[]; config: WidgetThemeConfig }> {
  const url = `${appUrl}/api/widget/comments?siteKey=${encodeURIComponent(siteKey)}&slug=${encodeURIComponent(slug)}`;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
}

export async function postComment(
  appUrl: string,
  token: string,
  payload: {
    body: string;
    siteKey: string;
    slug: string;
    parentId?: string;
  },
): Promise<CommentData> {
  const res = await fetch(`${appUrl}/api/widget/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to post comment");
  }
  return res.json();
}

export async function likeComment(
  appUrl: string,
  token: string,
  commentId: string,
): Promise<{ liked: boolean; count: number }> {
  const res = await fetch(`${appUrl}/api/widget/comments/${commentId}/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to toggle like");
  }
  return res.json();
}

export async function updateComment(
  appUrl: string,
  token: string,
  commentId: string,
  body: string,
): Promise<CommentData> {
  const res = await fetch(`${appUrl}/api/widget/comments/${commentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to update comment");
  }
  return res.json();
}

export async function deleteComment(
  appUrl: string,
  token: string,
  commentId: string,
): Promise<CommentData> {
  const res = await fetch(`${appUrl}/api/widget/comments/${commentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: "DELETED" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to delete comment");
  }
  return res.json();
}

export async function exchangeGoogleToken(
  appUrl: string,
  code: string,
  codeVerifier: string,
): Promise<string> {
  const res = await fetch(`${appUrl}/api/widget/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, codeVerifier }),
  });
  if (!res.ok) throw new Error("Auth failed");
  const { token } = await res.json();
  return token;
}

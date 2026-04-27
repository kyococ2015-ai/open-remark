import type { CommentData } from "./types";

export async function fetchComments(
  appUrl: string,
  siteKey: string,
  slug: string,
): Promise<CommentData[]> {
  const url = `${appUrl}/api/widget/comments?siteKey=${encodeURIComponent(siteKey)}&slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url);
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

export async function exchangeGoogleToken(
  appUrl: string,
  idToken: string,
): Promise<string> {
  const res = await fetch(`${appUrl}/api/widget/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Auth failed");
  const { token } = await res.json();
  return token;
}

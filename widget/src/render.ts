import type { CommentData, AuthState } from "./types";

export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(isoDate),
  );
}

function avatarEl(name: string, image: string | null | undefined): HTMLElement {
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = name;
    img.className = "zeon-avatar";
    img.width = 28;
    img.height = 28;
    return img;
  }
  const el = document.createElement("div");
  el.className = "zeon-avatar-placeholder";
  el.setAttribute("aria-hidden", "true");
  el.textContent = name.slice(0, 2).toUpperCase();
  return el;
}

function renderCommentItem(
  comment: CommentData,
  depth: number,
  onReply: (comment: CommentData) => void,
): HTMLElement {
  const li = document.createElement("li");
  li.className = depth === 0 ? "zeon-comment" : "zeon-reply";
  li.dataset.id = comment.id;

  // Meta row
  const meta = document.createElement("div");
  meta.className = "zeon-comment-meta";
  meta.appendChild(avatarEl(comment.authorName, comment.authorImage));

  const authorEl = document.createElement("span");
  authorEl.className = "zeon-comment-author";
  authorEl.textContent = comment.authorName;
  meta.appendChild(authorEl);

  const timeEl = document.createElement("time");
  timeEl.className = "zeon-comment-time";
  timeEl.dateTime = comment.createdAt;
  timeEl.textContent = formatRelativeTime(comment.createdAt);
  meta.appendChild(timeEl);

  if (comment.status === "PENDING") {
    const badge = document.createElement("span");
    badge.className = "zeon-pending-badge";
    badge.textContent = "Pending review";
    meta.appendChild(badge);
  }

  li.appendChild(meta);

  // Body
  const body = document.createElement("p");
  body.className = "zeon-comment-body";
  body.textContent = comment.body;
  li.appendChild(body);

  // Actions (reply only at top level)
  if (depth === 0) {
    const actions = document.createElement("div");
    actions.className = "zeon-comment-actions";

    const replyBtn = document.createElement("button");
    replyBtn.className = "zeon-btn zeon-btn-ghost zeon-btn-sm";
    replyBtn.textContent = "Reply";
    replyBtn.type = "button";
    replyBtn.addEventListener("click", () => onReply(comment));
    actions.appendChild(replyBtn);
    li.appendChild(actions);
  }

  // Replies
  if (comment.replies?.length > 0) {
    const repliesList = document.createElement("ul");
    repliesList.className = "zeon-replies";
    repliesList.setAttribute("aria-label", `Replies to ${comment.authorName}`);
    for (const reply of comment.replies) {
      repliesList.appendChild(renderCommentItem(reply, depth + 1, onReply));
    }
    li.appendChild(repliesList);
  }

  return li;
}

export function renderCommentList(
  comments: CommentData[],
  onReply: (comment: CommentData) => void,
): HTMLElement {
  if (comments.length === 0) {
    const el = document.createElement("div");
    el.className = "zeon-empty";
    el.textContent = "No comments yet. Be the first to comment!";
    return el;
  }

  const list = document.createElement("ul");
  list.className = "zeon-list";
  list.setAttribute("aria-label", "Comments");
  for (const c of comments) {
    list.appendChild(renderCommentItem(c, 0, onReply));
  }
  return list;
}

export function renderAuthBar(
  auth: AuthState,
  onSignIn: () => void,
  onSignOut: () => void,
): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "zeon-auth-bar";

  if (auth.status === "authenticated") {
    bar.appendChild(avatarEl(auth.user.name, auth.user.image));
    const name = document.createElement("span");
    name.className = "zeon-user-name";
    name.textContent = auth.user.name;
    bar.appendChild(name);

    const signOutBtn = document.createElement("button");
    signOutBtn.className = "zeon-btn zeon-btn-ghost zeon-btn-sm";
    signOutBtn.textContent = "Sign out";
    signOutBtn.type = "button";
    signOutBtn.addEventListener("click", onSignOut);
    bar.appendChild(signOutBtn);
  } else {
    const label = document.createElement("span");
    label.style.flex = "1";
    label.style.color = "var(--zeon-muted)";
    label.style.fontSize = "13px";
    label.textContent = "Sign in to leave a comment";
    bar.appendChild(label);

    const signInBtn = document.createElement("button");
    signInBtn.className = "zeon-btn zeon-btn-google";
    signInBtn.type = "button";
    signInBtn.disabled = auth.status === "loading";
    signInBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>${auth.status === "loading" ? "Signing in…" : "Continue with Google"}`;
    signInBtn.addEventListener("click", onSignIn);
    bar.appendChild(signInBtn);
  }

  return bar;
}

export function renderCommentForm(
  onSubmit: (body: string, parentId?: string) => Promise<void>,
  replyTo: CommentData | null,
  onCancelReply: () => void,
  isSubmitting: boolean,
): HTMLElement {
  const form = document.createElement("div");
  form.className = "zeon-form";

  if (replyTo) {
    const indicator = document.createElement("div");
    indicator.className = "zeon-reply-indicator";
    indicator.innerHTML = `Replying to <strong>${replyTo.authorName}</strong>`;
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.setAttribute("aria-label", "Cancel reply");
    cancelBtn.textContent = "✕";
    cancelBtn.addEventListener("click", onCancelReply);
    indicator.appendChild(cancelBtn);
    form.appendChild(indicator);
  }

  const textarea = document.createElement("textarea");
  textarea.placeholder = "Write a comment…";
  textarea.setAttribute("aria-label", replyTo ? `Reply to ${replyTo.authorName}` : "Write a comment");
  textarea.rows = 3;
  textarea.disabled = isSubmitting;
  form.appendChild(textarea);

  const actions = document.createElement("div");
  actions.className = "zeon-form-actions";

  const submitBtn = document.createElement("button");
  submitBtn.className = "zeon-btn zeon-btn-primary";
  submitBtn.type = "button";
  submitBtn.textContent = isSubmitting ? "Posting…" : replyTo ? "Post reply" : "Post comment";
  submitBtn.disabled = isSubmitting;
  submitBtn.addEventListener("click", async () => {
    const body = textarea.value.trim();
    if (!body) {
      textarea.focus();
      return;
    }
    await onSubmit(body, replyTo?.id);
    textarea.value = "";
  });

  actions.appendChild(submitBtn);
  form.appendChild(actions);

  return form;
}

export function renderError(message: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "zeon-error";
  el.setAttribute("role", "alert");
  el.textContent = message;
  return el;
}

export function renderLoading(): HTMLElement {
  const el = document.createElement("div");
  el.className = "zeon-loading";
  el.setAttribute("aria-live", "polite");
  el.textContent = "Loading comments…";
  return el;
}

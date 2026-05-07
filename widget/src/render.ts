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

function avatarEl(name: string, image: string | null | undefined, small = false): HTMLElement {
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = name;
    img.className = small ? "z-avatar z-avatar-sm" : "z-avatar";
    img.width = small ? 24 : 30;
    img.height = small ? 24 : 30;
    return img;
  }
  const el = document.createElement("div");
  el.className = small
    ? "z-avatar-placeholder z-avatar-placeholder-sm"
    : "z-avatar-placeholder";
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
  li.className = depth === 0 ? "z-comment" : "z-reply";
  li.dataset.id = comment.id;

  // Meta row
  const meta = document.createElement("div");
  meta.className = "z-comment-meta";
  meta.appendChild(avatarEl(comment.authorName, comment.authorImage, depth > 0));

  const authorEl = document.createElement("span");
  authorEl.className = "z-comment-author";
  authorEl.textContent = comment.authorName;
  meta.appendChild(authorEl);

  if (comment.status === "PENDING") {
    const badge = document.createElement("span");
    badge.className = "z-pending-badge";
    badge.textContent = "Pending";
    meta.appendChild(badge);
  }

  const timeEl = document.createElement("time");
  timeEl.className = "z-comment-time";
  timeEl.dateTime = comment.createdAt;
  timeEl.textContent = formatRelativeTime(comment.createdAt);
  meta.appendChild(timeEl);

  li.appendChild(meta);

  // Body — indented to align under author name
  const body = document.createElement("p");
  body.className = "z-comment-body";
  body.textContent = comment.body;
  li.appendChild(body);

  // Actions (reply only at top level)
  if (depth === 0) {
    const actions = document.createElement("div");
    actions.className = "z-comment-actions";

    const replyBtn = document.createElement("button");
    replyBtn.className = "z-btn z-btn-ghost z-btn-sm";
    replyBtn.textContent = "Reply";
    replyBtn.type = "button";
    replyBtn.addEventListener("click", () => onReply(comment));
    actions.appendChild(replyBtn);
    li.appendChild(actions);
  }

  // Replies
  if (comment.replies?.length > 0) {
    const repliesList = document.createElement("ul");
    repliesList.className = "z-replies";
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
    el.className = "z-empty";

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.5");
    icon.setAttribute("aria-hidden", "true");
    icon.classList.add("z-empty-icon");
    icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />`;
    el.appendChild(icon);

    const title = document.createElement("p");
    title.className = "z-empty-title";
    title.textContent = "No comments yet";
    el.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "z-empty-desc";
    desc.textContent = "Be the first to share your thoughts.";
    el.appendChild(desc);

    return el;
  }

  const list = document.createElement("ul");
  list.className = "z-list";
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
  bar.className = "z-auth-bar";

  if (auth.status === "authenticated") {
    bar.appendChild(avatarEl(auth.user.name, auth.user.image));
    const name = document.createElement("span");
    name.className = "z-user-name";
    name.textContent = auth.user.name;
    bar.appendChild(name);

    const signOutBtn = document.createElement("button");
    signOutBtn.className = "z-btn z-btn-ghost z-btn-sm";
    signOutBtn.textContent = "Sign out";
    signOutBtn.type = "button";
    signOutBtn.addEventListener("click", onSignOut);
    bar.appendChild(signOutBtn);
  } else {
    const label = document.createElement("span");
    label.className = "z-user-name";
    label.textContent = "Sign in to comment";
    bar.appendChild(label);

    const signInBtn = document.createElement("button");
    signInBtn.className = "z-btn z-btn-google";
    signInBtn.type = "button";
    signInBtn.disabled = auth.status === "loading";
    signInBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>${auth.status === "loading" ? "Signing in…" : "Continue with Google"}`;
    signInBtn.addEventListener("click", onSignIn);
    bar.appendChild(signInBtn);
  }

  return bar;
}

const MAX_CHARS = 2000;

export function renderCommentForm(
  onSubmit: (body: string, parentId?: string) => Promise<void>,
  replyTo: CommentData | null,
  onCancelReply: () => void,
  isSubmitting: boolean,
): HTMLElement {
  const form = document.createElement("div");
  form.className = "z-form";

  if (replyTo) {
    const indicator = document.createElement("div");
    indicator.className = "z-reply-indicator";
    indicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>Replying to <strong>${replyTo.authorName}</strong>`;
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "z-reply-indicator-cancel";
    cancelBtn.setAttribute("aria-label", "Cancel reply");
    cancelBtn.textContent = "✕";
    cancelBtn.addEventListener("click", onCancelReply);
    indicator.appendChild(cancelBtn);
    form.appendChild(indicator);
  }

  const textarea = document.createElement("textarea");
  textarea.placeholder = replyTo ? `Reply to ${replyTo.authorName}…` : "Write a comment…";
  textarea.setAttribute(
    "aria-label",
    replyTo ? `Reply to ${replyTo.authorName}` : "Write a comment",
  );
  textarea.rows = 3;
  textarea.disabled = isSubmitting;

  // Auto-grow
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    const len = textarea.value.length;
    counter.textContent = `${len} / ${MAX_CHARS}`;
    counter.classList.toggle("z-char-counter-warn", len >= MAX_CHARS * 0.9 && len < MAX_CHARS);
    counter.classList.toggle("z-char-counter-over", len > MAX_CHARS);
    submitBtn.disabled = isSubmitting || len === 0 || len > MAX_CHARS;
  });

  form.appendChild(textarea);

  const footer = document.createElement("div");
  footer.className = "z-form-footer";

  const counter = document.createElement("span");
  counter.className = "z-char-counter";
  counter.setAttribute("aria-live", "polite");
  counter.textContent = `0 / ${MAX_CHARS}`;
  footer.appendChild(counter);

  const submitBtn = document.createElement("button");
  submitBtn.className = "z-btn z-btn-primary";
  submitBtn.type = "button";
  submitBtn.textContent = isSubmitting ? "Posting…" : replyTo ? "Post reply" : "Post comment";
  submitBtn.disabled = isSubmitting;
  submitBtn.addEventListener("click", async () => {
    const body = textarea.value.trim();
    if (!body || body.length > MAX_CHARS) {
      textarea.focus();
      return;
    }
    await onSubmit(body, replyTo?.id);
    textarea.value = "";
    textarea.style.height = "";
    counter.textContent = `0 / ${MAX_CHARS}`;
    counter.classList.remove("z-char-counter-warn", "z-char-counter-over");
    submitBtn.disabled = true;
  });

  footer.appendChild(submitBtn);
  form.appendChild(footer);

  return form;
}

export function renderError(message: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "z-error";
  el.setAttribute("role", "alert");
  el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${message}`;
  return el;
}

/** Skeleton for the auth bar (shown while theme + comments load). */
export function renderLoadingAuthBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "z-skeleton-authbar";
  bar.setAttribute("aria-hidden", "true");

  const avatar = document.createElement("div");
  avatar.className = "z-skeleton z-skeleton-avatar";
  bar.appendChild(avatar);

  const name = document.createElement("div");
  name.className = "z-skeleton z-skeleton-name";
  name.style.width = "90px";
  bar.appendChild(name);

  const spacer = document.createElement("div");
  spacer.className = "z-skeleton-spacer";
  bar.appendChild(spacer);

  const btn = document.createElement("div");
  btn.className = "z-skeleton z-skeleton-name";
  btn.style.width = "70px";
  btn.style.height = "28px";
  btn.style.borderRadius = "var(--z-radius-sm)";
  bar.appendChild(btn);

  return bar;
}

export function renderLoading(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.setAttribute("aria-busy", "true");
  wrap.setAttribute("aria-label", "Loading comments");

  // Comment skeletons: [nameWidth, [bodyLineWidths]]
  const items: [string, string[]][] = [
    ["110px", ["88%", "64%"]],
    ["80px",  ["92%", "76%", "48%"]],
    ["130px", ["70%", "84%"]],
  ];

  const list = document.createElement("ul");
  list.className = "z-loading";

  for (const [nameWidth, bodyLines] of items) {
    const item = document.createElement("li");
    item.className = "z-skeleton-item";

    // Meta row: avatar | name | spacer | timestamp
    const meta = document.createElement("div");
    meta.className = "z-skeleton-meta";
    meta.setAttribute("aria-hidden", "true");

    const avatar = document.createElement("div");
    avatar.className = "z-skeleton z-skeleton-avatar";
    meta.appendChild(avatar);

    const name = document.createElement("div");
    name.className = "z-skeleton z-skeleton-name";
    name.style.width = nameWidth;
    meta.appendChild(name);

    const spacer = document.createElement("div");
    spacer.className = "z-skeleton-spacer";
    meta.appendChild(spacer);

    const time = document.createElement("div");
    time.className = "z-skeleton z-skeleton-time";
    meta.appendChild(time);

    item.appendChild(meta);

    // Body lines — indented to align with text
    for (const w of bodyLines) {
      const line = document.createElement("div");
      line.className = "z-skeleton z-skeleton-line";
      line.style.width = w;
      item.appendChild(line);
    }

    list.appendChild(item);
  }

  wrap.appendChild(list);
  return wrap;
}

"use strict";
(() => {
  // widget/src/api.ts
  async function fetchComments(appUrl, siteKey, slug) {
    const url = `${appUrl}/api/widget/comments?siteKey=${encodeURIComponent(siteKey)}&slug=${encodeURIComponent(slug)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch comments");
    return res.json();
  }
  async function postComment(appUrl, token, payload) {
    const res = await fetch(`${appUrl}/api/widget/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Failed to post comment");
    }
    return res.json();
  }
  async function exchangeGoogleToken(appUrl, idToken) {
    const res = await fetch(`${appUrl}/api/widget/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
    if (!res.ok) throw new Error("Auth failed");
    const { token } = await res.json();
    return token;
  }

  // widget/src/auth.ts
  var STORAGE_KEY = "zeon_widget_token";
  function loadStoredAuth() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return { status: "idle" };
      const parsed = JSON.parse(raw);
      if (Date.now() > parsed.exp) {
        sessionStorage.removeItem(STORAGE_KEY);
        return { status: "idle" };
      }
      return { status: "authenticated", token: parsed.token, user: parsed.user };
    } catch {
      return { status: "idle" };
    }
  }
  function saveAuth(token, user) {
    const exp = Date.now() + 7 * 24 * 60 * 60 * 1e3;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, exp }));
  }
  function clearAuth() {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  async function signInWithGoogle(appUrl, googleClientId) {
    return new Promise((resolve, reject) => {
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
          client_id: googleClientId,
          redirect_uri: `${appUrl}/api/widget/oauth-callback`,
          response_type: "id_token",
          scope: "openid email profile",
          nonce: Math.random().toString(36).slice(2),
          prompt: "select_account"
        }),
        "zeon-google-signin",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );
      if (!popup) {
        reject(new Error("Popup blocked. Please allow popups for this site."));
        return;
      }
      let timer;
      const handler = async (e) => {
        if (e.origin !== appUrl) return;
        if (e.data?.type !== "ZEON_GOOGLE_TOKEN") return;
        clearInterval(timer);
        window.removeEventListener("message", handler);
        popup.close();
        try {
          const idToken = e.data.idToken;
          const token = await exchangeGoogleToken(appUrl, idToken);
          const payload = JSON.parse(atob(token.split(".")[1]));
          const user = {
            email: payload.sub,
            name: payload.name,
            image: payload.image
          };
          saveAuth(token, user);
          resolve({ token, user });
        } catch (err) {
          reject(err);
        }
      };
      window.addEventListener("message", handler);
      timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          window.removeEventListener("message", handler);
          reject(new Error("Sign-in cancelled"));
        }
      }, 500);
    });
  }

  // widget/src/render.ts
  function formatRelativeTime(isoDate) {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 6e4);
    const hours = Math.floor(diff / 36e5);
    const days = Math.floor(diff / 864e5);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return new Intl.DateTimeFormat(void 0, { month: "short", day: "numeric" }).format(
      new Date(isoDate)
    );
  }
  function avatarEl(name, image, small = false) {
    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = name;
      img.className = small ? "zeon-avatar zeon-avatar-sm" : "zeon-avatar";
      img.width = small ? 24 : 30;
      img.height = small ? 24 : 30;
      return img;
    }
    const el = document.createElement("div");
    el.className = small ? "zeon-avatar-placeholder zeon-avatar-placeholder-sm" : "zeon-avatar-placeholder";
    el.setAttribute("aria-hidden", "true");
    el.textContent = name.slice(0, 2).toUpperCase();
    return el;
  }
  function renderCommentItem(comment, depth, onReply) {
    const li = document.createElement("li");
    li.className = depth === 0 ? "zeon-comment" : "zeon-reply";
    li.dataset.id = comment.id;
    const meta = document.createElement("div");
    meta.className = "zeon-comment-meta";
    meta.appendChild(avatarEl(comment.authorName, comment.authorImage, depth > 0));
    const authorEl = document.createElement("span");
    authorEl.className = "zeon-comment-author";
    authorEl.textContent = comment.authorName;
    meta.appendChild(authorEl);
    if (comment.status === "PENDING") {
      const badge = document.createElement("span");
      badge.className = "zeon-pending-badge";
      badge.textContent = "Pending";
      meta.appendChild(badge);
    }
    const timeEl = document.createElement("time");
    timeEl.className = "zeon-comment-time";
    timeEl.dateTime = comment.createdAt;
    timeEl.textContent = formatRelativeTime(comment.createdAt);
    meta.appendChild(timeEl);
    li.appendChild(meta);
    const body = document.createElement("p");
    body.className = "zeon-comment-body";
    body.textContent = comment.body;
    li.appendChild(body);
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
  function renderCommentList(comments, onReply) {
    if (comments.length === 0) {
      const el = document.createElement("div");
      el.className = "zeon-empty";
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "currentColor");
      icon.setAttribute("stroke-width", "1.5");
      icon.setAttribute("aria-hidden", "true");
      icon.classList.add("zeon-empty-icon");
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />`;
      el.appendChild(icon);
      const title = document.createElement("p");
      title.className = "zeon-empty-title";
      title.textContent = "No comments yet";
      el.appendChild(title);
      const desc = document.createElement("p");
      desc.className = "zeon-empty-desc";
      desc.textContent = "Be the first to share your thoughts.";
      el.appendChild(desc);
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
  function renderAuthBar(auth, onSignIn, onSignOut) {
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
      label.className = "zeon-user-name";
      label.textContent = "Sign in to comment";
      bar.appendChild(label);
      const signInBtn = document.createElement("button");
      signInBtn.className = "zeon-btn zeon-btn-google";
      signInBtn.type = "button";
      signInBtn.disabled = auth.status === "loading";
      signInBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>${auth.status === "loading" ? "Signing in\u2026" : "Continue with Google"}`;
      signInBtn.addEventListener("click", onSignIn);
      bar.appendChild(signInBtn);
    }
    return bar;
  }
  var MAX_CHARS = 2e3;
  function renderCommentForm(onSubmit, replyTo, onCancelReply, isSubmitting) {
    const form = document.createElement("div");
    form.className = "zeon-form";
    if (replyTo) {
      const indicator = document.createElement("div");
      indicator.className = "zeon-reply-indicator";
      indicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>Replying to <strong>${replyTo.authorName}</strong>`;
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "zeon-reply-indicator-cancel";
      cancelBtn.setAttribute("aria-label", "Cancel reply");
      cancelBtn.textContent = "\u2715";
      cancelBtn.addEventListener("click", onCancelReply);
      indicator.appendChild(cancelBtn);
      form.appendChild(indicator);
    }
    const textarea = document.createElement("textarea");
    textarea.placeholder = replyTo ? `Reply to ${replyTo.authorName}\u2026` : "Write a comment\u2026";
    textarea.setAttribute(
      "aria-label",
      replyTo ? `Reply to ${replyTo.authorName}` : "Write a comment"
    );
    textarea.rows = 3;
    textarea.disabled = isSubmitting;
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
      const len = textarea.value.length;
      counter.textContent = `${len} / ${MAX_CHARS}`;
      counter.classList.toggle("zeon-char-counter-warn", len >= MAX_CHARS * 0.9 && len < MAX_CHARS);
      counter.classList.toggle("zeon-char-counter-over", len > MAX_CHARS);
      submitBtn.disabled = isSubmitting || len === 0 || len > MAX_CHARS;
    });
    form.appendChild(textarea);
    const footer = document.createElement("div");
    footer.className = "zeon-form-footer";
    const counter = document.createElement("span");
    counter.className = "zeon-char-counter";
    counter.setAttribute("aria-live", "polite");
    counter.textContent = `0 / ${MAX_CHARS}`;
    footer.appendChild(counter);
    const submitBtn = document.createElement("button");
    submitBtn.className = "zeon-btn zeon-btn-primary";
    submitBtn.type = "button";
    submitBtn.textContent = isSubmitting ? "Posting\u2026" : replyTo ? "Post reply" : "Post comment";
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
      counter.classList.remove("zeon-char-counter-warn", "zeon-char-counter-over");
      submitBtn.disabled = true;
    });
    footer.appendChild(submitBtn);
    form.appendChild(footer);
    return form;
  }
  function renderError(message) {
    const el = document.createElement("div");
    el.className = "zeon-error";
    el.setAttribute("role", "alert");
    el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${message}`;
    return el;
  }
  function renderLoading() {
    const list = document.createElement("ul");
    list.className = "zeon-loading";
    list.setAttribute("aria-busy", "true");
    list.setAttribute("aria-label", "Loading comments");
    const widths = [
      ["60%", "90%", "70%"],
      ["45%", "80%", "55%"],
      ["55%", "85%"]
    ];
    for (const lines of widths) {
      const item = document.createElement("li");
      item.className = "zeon-skeleton-item";
      const meta = document.createElement("div");
      meta.className = "zeon-skeleton-meta";
      const avatar = document.createElement("div");
      avatar.className = "zeon-skeleton zeon-skeleton-avatar";
      meta.appendChild(avatar);
      const name = document.createElement("div");
      name.className = "zeon-skeleton zeon-skeleton-name";
      meta.appendChild(name);
      item.appendChild(meta);
      for (const w of lines) {
        const line = document.createElement("div");
        line.className = "zeon-skeleton zeon-skeleton-line";
        line.style.width = w;
        line.style.marginLeft = "38px";
        item.appendChild(line);
      }
      list.appendChild(item);
    }
    return list;
  }

  // widget/src/index.ts
  function detectHostTheme(host) {
    const cs = getComputedStyle(document.documentElement);
    const get = (v) => cs.getPropertyValue(v).trim();
    const bg = get("--background");
    if (bg && /oklch|hsl\(|rgb\(|#[0-9a-f]/i.test(bg)) {
      host.setAttribute("data-theme-detected", "");
      return null;
    }
    const v3Pattern = /^\d[\d.]*\s+[\d.]+%\s+[\d.]+%$/;
    if (bg && v3Pattern.test(bg)) {
      host.setAttribute("data-theme-detected", "");
      const fg = get("--foreground");
      const border = get("--border");
      const mutedFg = get("--muted-foreground");
      const primary = get("--primary");
      const primaryFg = get("--primary-foreground");
      const muted = get("--muted");
      const radius = get("--radius");
      const accent = get("--accent");
      const lines = [":host {"];
      if (bg) lines.push(`  --zeon-bg: hsl(${bg});`);
      if (fg) lines.push(`  --zeon-text: hsl(${fg});`);
      if (border) lines.push(`  --zeon-border: hsl(${border});`);
      if (mutedFg) lines.push(`  --zeon-muted: hsl(${mutedFg});`);
      if (primary) lines.push(`  --zeon-primary: hsl(${primary});`);
      if (primaryFg) lines.push(`  --zeon-primary-fg: hsl(${primaryFg});`);
      if (muted) lines.push(`  --zeon-subtle: hsl(${muted});`);
      if (accent) lines.push(`  --zeon-accent: hsl(${accent});`);
      if (radius) lines.push(`  --zeon-radius: ${radius};`);
      lines.push("}");
      return lines.join("\n");
    }
    const bsBg = get("--bs-body-bg");
    if (bsBg) {
      host.setAttribute("data-theme-detected", "");
      const bsFg = get("--bs-body-color");
      const bsBorder = get("--bs-border-color");
      const bsSecondary = get("--bs-secondary-color");
      const bsPrimary = get("--bs-primary") || get("--bs-link-color");
      const lines = [":host {"];
      lines.push(`  --zeon-bg: ${bsBg};`);
      if (bsFg) lines.push(`  --zeon-text: ${bsFg};`);
      if (bsBorder) lines.push(`  --zeon-border: ${bsBorder};`);
      if (bsSecondary) lines.push(`  --zeon-muted: ${bsSecondary};`);
      if (bsPrimary) lines.push(`  --zeon-primary: ${bsPrimary};`);
      lines.push("}");
      return lines.join("\n");
    }
    const bodyStyle = getComputedStyle(document.body);
    const bodyBg = bodyStyle.backgroundColor;
    const m = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      const lum = (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) / 255;
      if (lum < 0.4) {
        host.setAttribute("data-theme-detected", "");
        return `:host {
  --zeon-bg: ${bodyBg};
  --zeon-text: #f1f5f9;
  --zeon-border: rgba(255,255,255,0.1);
  --zeon-muted: #94a3b8;
  --zeon-primary: #f1f5f9;
  --zeon-primary-fg: #0f172a;
  --zeon-subtle: rgba(255,255,255,0.06);
  --zeon-accent: rgba(255,255,255,0.08);
}`;
      }
    }
    return null;
  }
  var ZeonWidget = class {
    constructor(config) {
      this.comments = [];
      this.replyTo = null;
      this.isSubmitting = false;
      this.config = config;
      this.shadow = config.container.attachShadow({ mode: "open" });
      this.auth = loadStoredAuth();
      const style = document.createElement("style");
      style.textContent = `/* Zeon Comments Widget \u2014 scoped inside shadow DOM */

/* \u2500\u2500\u2500 Design tokens \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/*
 * :host vars try to inherit from the client page's CSS custom properties
 * (shadcn/Tailwind v4 uses direct color values: oklch/hsl/hex).
 * If the host page defines --background, --foreground, etc. they flow in
 * automatically. The hard-coded values are the fallback own theme.
 */
:host {
  display: block;
  font-family: var(--font-sans, var(--font-geist-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif));
  font-size: 14px;
  line-height: 1.6;

  /* These bind to the host's CSS vars first, then fall back to own theme */
  --zeon-bg:         var(--background,          #ffffff);
  --zeon-text:       var(--foreground,           #0f172a);
  --zeon-border:     var(--border,               #e2e8f0);
  --zeon-muted:      var(--muted-foreground,     #64748b);
  --zeon-primary:    var(--primary,              #0f172a);
  --zeon-primary-fg: var(--primary-foreground,   #ffffff);
  --zeon-subtle:     var(--muted,                #f1f5f9);
  --zeon-accent:     var(--accent,               #f1f5f9);
  --zeon-radius:     var(--radius,               8px);

  /* Derived */
  --zeon-radius-sm:  calc(var(--zeon-radius) * 0.6);
  --zeon-radius-lg:  calc(var(--zeon-radius) * 1.5);

  color: var(--zeon-text);
}

/* \u2500\u2500\u2500 Own fallback dark theme (only active when host has no CSS vars) \u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
@media (prefers-color-scheme: dark) {
  :host(:not([data-theme-detected])) {
    --zeon-bg:         #0f172a;
    --zeon-text:       #f8fafc;
    --zeon-border:     #1e293b;
    --zeon-muted:      #94a3b8;
    --zeon-primary:    #f8fafc;
    --zeon-primary-fg: #0f172a;
    --zeon-subtle:     #1e293b;
    --zeon-accent:     #1e293b;
  }
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* \u2500\u2500\u2500 Root container \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-root {
  background: var(--zeon-bg);
  border: 1px solid var(--zeon-border);
  border-radius: var(--zeon-radius-lg);
  overflow: hidden;
}

/* \u2500\u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 13px;
  border-bottom: 1px solid var(--zeon-border);
}

.zeon-header h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--zeon-text);
  letter-spacing: -0.01em;
}

/* \u2500\u2500\u2500 Auth bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-auth-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--zeon-border);
  background: var(--zeon-subtle);
  min-height: 48px;
}

/* \u2500\u2500\u2500 Avatars \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-avatar,
.zeon-avatar-placeholder {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
}

.zeon-avatar {
  background: var(--zeon-subtle);
  object-fit: cover;
}

.zeon-avatar-placeholder {
  background: var(--zeon-subtle);
  border: 1px solid var(--zeon-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--zeon-muted);
  letter-spacing: 0.03em;
}

.zeon-avatar-sm,
.zeon-avatar-placeholder-sm {
  width: 24px;
  height: 24px;
  font-size: 9px;
}

.zeon-user-name {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  color: var(--zeon-text);
}

/* \u2500\u2500\u2500 Buttons \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--zeon-radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.12s, opacity 0.12s, color 0.12s;
  font-family: inherit;
  touch-action: manipulation;
  white-space: nowrap;
  user-select: none;
}

.zeon-btn:focus-visible {
  outline: 2px solid var(--zeon-primary);
  outline-offset: 2px;
}

.zeon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.zeon-btn-primary {
  background: var(--zeon-primary);
  color: var(--zeon-primary-fg);
  border-color: var(--zeon-primary);
}

.zeon-btn-primary:hover:not(:disabled) {
  opacity: 0.88;
}

.zeon-btn-ghost {
  background: transparent;
  color: var(--zeon-muted);
  border-color: var(--zeon-border);
}

.zeon-btn-ghost:hover:not(:disabled) {
  background: var(--zeon-accent);
  color: var(--zeon-text);
}

.zeon-btn-sm {
  padding: 3px 9px;
  font-size: 12px;
  border-radius: calc(var(--zeon-radius-sm) * 0.85);
}

/* Google sign-in button */
.zeon-btn-google {
  background: var(--zeon-bg);
  color: var(--zeon-text);
  border-color: var(--zeon-border);
  font-size: 13px;
  padding: 6px 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.zeon-btn-google:hover:not(:disabled) {
  background: var(--zeon-accent);
}

.zeon-btn-google svg {
  flex-shrink: 0;
}

/* \u2500\u2500\u2500 Comment form \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-form {
  padding: 12px 16px;
  border-bottom: 1px solid var(--zeon-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.zeon-form textarea {
  width: 100%;
  min-height: 80px;
  max-height: 360px;
  padding: 9px 11px;
  border: 1px solid var(--zeon-border);
  border-radius: var(--zeon-radius-sm);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.55;
  resize: none;
  overflow-y: hidden;
  background: var(--zeon-bg);
  color: var(--zeon-text);
  transition: border-color 0.12s, box-shadow 0.12s;
  display: block;
}

.zeon-form textarea:focus {
  outline: none;
  border-color: var(--zeon-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--zeon-primary) 12%, transparent);
}

.zeon-form textarea::placeholder {
  color: var(--zeon-muted);
}

.zeon-form textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zeon-form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.zeon-char-counter {
  font-size: 11px;
  color: var(--zeon-muted);
  font-variant-numeric: tabular-nums;
  transition: color 0.12s;
}

.zeon-char-counter-warn {
  color: #f59e0b;
}

.zeon-char-counter-over {
  color: #ef4444;
  font-weight: 600;
}

/* Reply indicator */
.zeon-reply-indicator {
  padding: 6px 10px 6px 12px;
  background: var(--zeon-accent);
  border: 1px solid var(--zeon-border);
  border-left: 3px solid var(--zeon-primary);
  border-radius: var(--zeon-radius-sm);
  font-size: 12px;
  color: var(--zeon-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.zeon-reply-indicator strong {
  color: var(--zeon-text);
  font-weight: 600;
}

.zeon-reply-indicator-cancel {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--zeon-muted);
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zeon-reply-indicator-cancel:hover {
  background: var(--zeon-border);
  color: var(--zeon-text);
}

/* \u2500\u2500\u2500 Comments list \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-list {
  list-style: none;
}

/* Empty state */
.zeon-empty {
  padding: 40px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.zeon-empty-icon {
  width: 40px;
  height: 40px;
  color: var(--zeon-border);
  opacity: 0.8;
}

.zeon-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--zeon-text);
}

.zeon-empty-desc {
  font-size: 13px;
  color: var(--zeon-muted);
}

/* \u2500\u2500\u2500 Comment item \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-comment {
  padding: 14px 16px;
  border-bottom: 1px solid var(--zeon-border);
}

.zeon-comment:last-child {
  border-bottom: none;
}

.zeon-comment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.zeon-comment-author {
  font-weight: 600;
  font-size: 13px;
  color: var(--zeon-text);
}

.zeon-comment-time {
  font-size: 12px;
  color: var(--zeon-muted);
  margin-left: auto;
}

.zeon-comment-body {
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--zeon-text);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  padding-left: 38px; /* align under author name */
}

.zeon-comment-actions {
  margin-top: 6px;
  padding-left: 38px;
  display: flex;
  gap: 4px;
}

/* \u2500\u2500\u2500 Replies \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-replies {
  margin-top: 12px;
  margin-left: 38px;
  padding-left: 14px;
  border-left: 2px solid var(--zeon-border);
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.zeon-reply {
  padding: 10px 0;
  border-bottom: 1px solid var(--zeon-border);
}

.zeon-reply:last-child {
  border-bottom: none;
  padding-bottom: 2px;
}

.zeon-reply .zeon-comment-body {
  padding-left: 32px;
}

.zeon-reply .zeon-comment-meta {
  margin-bottom: 4px;
}

/* \u2500\u2500\u2500 Pending badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-pending-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 500;
  background: color-mix(in srgb, #f59e0b 12%, var(--zeon-bg));
  color: #b45309;
  border: 1px solid color-mix(in srgb, #f59e0b 25%, transparent);
  margin-left: 2px;
}

@media (prefers-color-scheme: dark) {
  :host(:not([data-theme-detected])) .zeon-pending-badge {
    background: color-mix(in srgb, #f59e0b 15%, transparent);
    color: #fbbf24;
    border-color: color-mix(in srgb, #f59e0b 30%, transparent);
  }
}

/* \u2500\u2500\u2500 Loading skeleton \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-loading {
  padding: 0;
  list-style: none;
}

.zeon-skeleton-item {
  padding: 14px 16px;
  border-bottom: 1px solid var(--zeon-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.zeon-skeleton-item:last-child {
  border-bottom: none;
}

.zeon-skeleton-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zeon-skeleton {
  background: linear-gradient(
    90deg,
    var(--zeon-subtle) 25%,
    var(--zeon-accent) 50%,
    var(--zeon-subtle) 75%
  );
  background-size: 200% 100%;
  border-radius: 4px;
  animation: zeon-shimmer 1.6s infinite linear;
}

@keyframes zeon-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.zeon-skeleton-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
}

.zeon-skeleton-name {
  height: 12px;
  width: 100px;
}

.zeon-skeleton-line {
  height: 11px;
}

/* \u2500\u2500\u2500 Error \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.zeon-error {
  padding: 10px 16px;
  background: color-mix(in srgb, #ef4444 10%, var(--zeon-bg));
  color: #b91c1c;
  font-size: 13px;
  border-bottom: 1px solid color-mix(in srgb, #ef4444 20%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (prefers-color-scheme: dark) {
  :host(:not([data-theme-detected])) .zeon-error {
    color: #fca5a5;
  }
}

/* \u2500\u2500\u2500 Accessibility \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
@media (prefers-reduced-motion: reduce) {
  .zeon-btn,
  .zeon-form textarea {
    transition: none;
  }
  .zeon-skeleton {
    animation: none;
    background: var(--zeon-subtle);
  }
}
`;
      this.shadow.appendChild(style);
      const themeOverride = detectHostTheme(config.container);
      if (themeOverride) {
        const themeStyle = document.createElement("style");
        themeStyle.textContent = themeOverride;
        this.shadow.appendChild(themeStyle);
      }
      this.root = document.createElement("div");
      this.root.className = "zeon-root";
      this.shadow.appendChild(this.root);
      this.render();
      this.loadComments();
    }
    async loadComments() {
      this.renderLoadingState();
      try {
        this.comments = await fetchComments(
          this.config.appUrl,
          this.config.siteKey,
          this.config.slug
        );
        this.render();
      } catch {
        this.renderErrorState("Failed to load comments. Please try again later.");
      }
    }
    async handleSignIn() {
      this.auth = { status: "loading" };
      this.render();
      try {
        const googleClientId = "";
        const { token, user } = await signInWithGoogle(this.config.appUrl, googleClientId);
        this.auth = { status: "authenticated", token, user };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign-in failed";
        this.auth = { status: "error", message };
        setTimeout(() => {
          this.auth = { status: "idle" };
          this.render();
        }, 3e3);
      }
      this.render();
    }
    handleSignOut() {
      clearAuth();
      this.auth = { status: "idle" };
      this.replyTo = null;
      this.render();
    }
    async handleSubmit(body, parentId) {
      if (this.auth.status !== "authenticated") return;
      this.isSubmitting = true;
      this.render();
      try {
        const comment = await postComment(this.config.appUrl, this.auth.token, {
          body,
          siteKey: this.config.siteKey,
          slug: this.config.slug,
          parentId
        });
        if (parentId) {
          const parent = this.comments.find((c) => c.id === parentId);
          if (parent) {
            parent.replies = [...parent.replies ?? [], comment];
          }
        } else {
          this.comments = [...this.comments, comment];
        }
        this.replyTo = null;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to post";
        this.renderErrorBanner(message);
      } finally {
        this.isSubmitting = false;
        this.render();
      }
    }
    renderLoadingState() {
      this.root.innerHTML = "";
      const header = this.buildHeader();
      this.root.appendChild(header);
      this.root.appendChild(renderLoading());
    }
    renderErrorState(message) {
      this.root.innerHTML = "";
      this.root.appendChild(renderError(message));
    }
    renderErrorBanner(message) {
      const existing = this.root.querySelector(".zeon-error");
      if (existing) existing.remove();
      const banner = renderError(message);
      this.root.insertBefore(banner, this.root.firstChild);
      setTimeout(() => banner.remove(), 4e3);
    }
    buildHeader() {
      const header = document.createElement("div");
      header.className = "zeon-header";
      const heading = document.createElement("h2");
      const count = this.comments.length;
      heading.textContent = `${count} Comment${count !== 1 ? "s" : ""}`;
      header.appendChild(heading);
      return header;
    }
    render() {
      this.root.innerHTML = "";
      this.root.appendChild(this.buildHeader());
      if (this.auth.status === "error") {
        this.root.appendChild(renderError(this.auth.message));
      }
      this.root.appendChild(
        renderAuthBar(
          this.auth,
          () => this.handleSignIn(),
          () => this.handleSignOut()
        )
      );
      if (this.auth.status === "authenticated") {
        this.root.appendChild(
          renderCommentForm(
            (body, parentId) => this.handleSubmit(body, parentId),
            this.replyTo,
            () => {
              this.replyTo = null;
              this.render();
            },
            this.isSubmitting
          )
        );
      }
      this.root.appendChild(
        renderCommentList(this.comments, (comment) => {
          if (this.auth.status !== "authenticated") {
            this.handleSignIn();
            return;
          }
          this.replyTo = comment;
          this.render();
          const form = this.shadow.querySelector(".zeon-form");
          form?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        })
      );
    }
  };
  function mount() {
    const appUrl = "http://localhost:3000";
    const elements = document.querySelectorAll("[data-zeon-comments]");
    for (const el of elements) {
      const siteKey = el.dataset.siteKey;
      const slug = el.dataset.slug;
      if (!siteKey || !slug) {
        console.warn("[Zeon Comments] Missing data-site-key or data-slug", el);
        continue;
      }
      new ZeonWidget({ siteKey, slug, container: el, appUrl });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
  window.ZeonComments = { mount };
})();

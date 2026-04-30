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
  function renderLoadingAuthBar() {
    const bar = document.createElement("div");
    bar.className = "zeon-skeleton-authbar";
    bar.setAttribute("aria-hidden", "true");
    const avatar = document.createElement("div");
    avatar.className = "zeon-skeleton zeon-skeleton-avatar";
    bar.appendChild(avatar);
    const name = document.createElement("div");
    name.className = "zeon-skeleton zeon-skeleton-name";
    name.style.width = "90px";
    bar.appendChild(name);
    const spacer = document.createElement("div");
    spacer.className = "zeon-skeleton-spacer";
    bar.appendChild(spacer);
    const btn = document.createElement("div");
    btn.className = "zeon-skeleton zeon-skeleton-name";
    btn.style.width = "70px";
    btn.style.height = "28px";
    btn.style.borderRadius = "var(--zeon-radius-sm)";
    bar.appendChild(btn);
    return bar;
  }
  function renderLoading() {
    const wrap = document.createElement("div");
    wrap.setAttribute("aria-busy", "true");
    wrap.setAttribute("aria-label", "Loading comments");
    const items = [
      ["110px", ["88%", "64%"]],
      ["80px", ["92%", "76%", "48%"]],
      ["130px", ["70%", "84%"]]
    ];
    const list = document.createElement("ul");
    list.className = "zeon-loading";
    for (const [nameWidth, bodyLines] of items) {
      const item = document.createElement("li");
      item.className = "zeon-skeleton-item";
      const meta = document.createElement("div");
      meta.className = "zeon-skeleton-meta";
      meta.setAttribute("aria-hidden", "true");
      const avatar = document.createElement("div");
      avatar.className = "zeon-skeleton zeon-skeleton-avatar";
      meta.appendChild(avatar);
      const name = document.createElement("div");
      name.className = "zeon-skeleton zeon-skeleton-name";
      name.style.width = nameWidth;
      meta.appendChild(name);
      const spacer = document.createElement("div");
      spacer.className = "zeon-skeleton-spacer";
      meta.appendChild(spacer);
      const time = document.createElement("div");
      time.className = "zeon-skeleton zeon-skeleton-time";
      meta.appendChild(time);
      item.appendChild(meta);
      for (const w of bodyLines) {
        const line = document.createElement("div");
        line.className = "zeon-skeleton zeon-skeleton-line";
        line.style.width = w;
        item.appendChild(line);
      }
      list.appendChild(item);
    }
    wrap.appendChild(list);
    return wrap;
  }

  // widget/src/index.ts
  function readableOn(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return "#ffffff";
    const n = parseInt(m[1], 16);
    const r = n >> 16 & 255;
    const g = n >> 8 & 255;
    const b = n & 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? "#0f172a" : "#ffffff";
  }
  function buildThemeStyle(cfg) {
    const lines = [];
    if (cfg.theme === "DARK") {
      lines.push(`:host {
  --zeon-bg: #0f172a;
  --zeon-text: #f8fafc;
  --zeon-border: #1e293b;
  --zeon-muted: #94a3b8;
  --zeon-subtle: #1e293b;
  --zeon-accent: #1e293b;
  --zeon-skel-base: #1e293b;
  --zeon-skel-glow: #334155;
}`);
    } else if (cfg.theme === "LIGHT") {
      lines.push(`:host {
  --zeon-bg: #ffffff;
  --zeon-text: #0f172a;
  --zeon-border: #e2e8f0;
  --zeon-muted: #64748b;
  --zeon-subtle: #f1f5f9;
  --zeon-accent: #f1f5f9;
  --zeon-skel-base: #e8edf2;
  --zeon-skel-glow: #f8fafc;
}`);
    }
    lines.push(`:host {
  --zeon-primary: ${cfg.primaryColor};
  --zeon-primary-fg: ${readableOn(cfg.primaryColor)};
  --zeon-radius: ${cfg.radius}px;
}`);
    return lines.join("\n");
  }
  function themeKey(siteKey) {
    return `zeon_theme_${siteKey}`;
  }
  function loadCachedTheme(siteKey) {
    try {
      const raw = localStorage.getItem(themeKey(siteKey));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function saveCachedTheme(siteKey, cfg) {
    try {
      localStorage.setItem(themeKey(siteKey), JSON.stringify(cfg));
    } catch {
    }
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
      style.textContent = '/* Zeon Comments Widget \u2014 scoped inside shadow DOM */\n\n/* \u2500\u2500\u2500 Design tokens \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n/*\n * Defaults are the LIGHT theme. The widget JS injects a :host override that\n * applies the dashboard appearance (theme + primaryColor + radius) on load.\n * The @media block below is the AUTO theme fallback: if the dashboard sets\n * theme=AUTO, no override is injected and the OS preference takes effect.\n */\n:host {\n  display: block;\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n  font-size: 14px;\n  line-height: 1.6;\n\n  --zeon-bg:         #ffffff;\n  --zeon-text:       #0f172a;\n  --zeon-border:     #e2e8f0;\n  --zeon-muted:      #64748b;\n  --zeon-primary:    #0f172a;\n  --zeon-primary-fg: #ffffff;\n  --zeon-subtle:     #f1f5f9;\n  --zeon-accent:     #f1f5f9;\n  --zeon-radius:     8px;\n\n  --zeon-radius-sm:  calc(var(--zeon-radius) * 0.6);\n  --zeon-radius-lg:  calc(var(--zeon-radius) * 1.5);\n\n  /* Skeleton-specific tokens \u2014 always distinct base vs highlight */\n  --zeon-skel-base:  #e8edf2;\n  --zeon-skel-glow:  #f8fafc;\n\n  color: var(--zeon-text);\n}\n\n/* AUTO theme: follow OS preference. JS-injected explicit theme overrides win\n   because they appear after this stylesheet in the shadow root. */\n@media (prefers-color-scheme: dark) {\n  :host {\n    --zeon-bg:         #0f172a;\n    --zeon-text:       #f8fafc;\n    --zeon-border:     #1e293b;\n    --zeon-muted:      #94a3b8;\n    --zeon-subtle:     #1e293b;\n    --zeon-accent:     #1e293b;\n    --zeon-skel-base:  #1e293b;\n    --zeon-skel-glow:  #334155;\n  }\n}\n\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\n/* \u2500\u2500\u2500 Root container \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-root {\n  background: var(--zeon-bg);\n  border: 1px solid var(--zeon-border);\n  border-radius: var(--zeon-radius-lg);\n  overflow: hidden;\n}\n\n/* \u2500\u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 14px 16px 13px;\n  border-bottom: 1px solid var(--zeon-border);\n}\n\n.zeon-header h2 {\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--zeon-text);\n  letter-spacing: -0.01em;\n}\n\n/* \u2500\u2500\u2500 Auth bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-auth-bar {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 10px 16px;\n  border-bottom: 1px solid var(--zeon-border);\n  background: var(--zeon-subtle);\n  min-height: 48px;\n}\n\n/* \u2500\u2500\u2500 Avatars \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-avatar,\n.zeon-avatar-placeholder {\n  width: 30px;\n  height: 30px;\n  border-radius: 50%;\n  flex-shrink: 0;\n}\n\n.zeon-avatar {\n  background: var(--zeon-subtle);\n  object-fit: cover;\n}\n\n.zeon-avatar-placeholder {\n  background: var(--zeon-subtle);\n  border: 1px solid var(--zeon-border);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 11px;\n  font-weight: 700;\n  color: var(--zeon-muted);\n  letter-spacing: 0.03em;\n}\n\n.zeon-avatar-sm,\n.zeon-avatar-placeholder-sm {\n  width: 24px;\n  height: 24px;\n  font-size: 9px;\n}\n\n.zeon-user-name {\n  font-size: 13px;\n  font-weight: 500;\n  flex: 1;\n  color: var(--zeon-text);\n}\n\n/* \u2500\u2500\u2500 Buttons \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  padding: 6px 14px;\n  border-radius: var(--zeon-radius-sm);\n  font-size: 13px;\n  font-weight: 500;\n  cursor: pointer;\n  border: 1px solid transparent;\n  transition: background-color 0.12s, opacity 0.12s, color 0.12s;\n  font-family: inherit;\n  touch-action: manipulation;\n  white-space: nowrap;\n  user-select: none;\n}\n\n.zeon-btn:focus-visible {\n  outline: 2px solid var(--zeon-primary);\n  outline-offset: 2px;\n}\n\n.zeon-btn:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n  pointer-events: none;\n}\n\n.zeon-btn-primary {\n  background: var(--zeon-primary);\n  color: var(--zeon-primary-fg);\n  border-color: var(--zeon-primary);\n}\n\n.zeon-btn-primary:hover:not(:disabled) {\n  opacity: 0.88;\n}\n\n.zeon-btn-ghost {\n  background: transparent;\n  color: var(--zeon-muted);\n  border-color: var(--zeon-border);\n}\n\n.zeon-btn-ghost:hover:not(:disabled) {\n  background: var(--zeon-accent);\n  color: var(--zeon-text);\n}\n\n.zeon-btn-sm {\n  padding: 3px 9px;\n  font-size: 12px;\n  border-radius: calc(var(--zeon-radius-sm) * 0.85);\n}\n\n/* Google sign-in button */\n.zeon-btn-google {\n  background: var(--zeon-bg);\n  color: var(--zeon-text);\n  border-color: var(--zeon-border);\n  font-size: 13px;\n  padding: 6px 14px;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);\n}\n\n.zeon-btn-google:hover:not(:disabled) {\n  background: var(--zeon-accent);\n}\n\n.zeon-btn-google svg {\n  flex-shrink: 0;\n}\n\n/* \u2500\u2500\u2500 Comment form \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-form {\n  padding: 12px 16px;\n  border-bottom: 1px solid var(--zeon-border);\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n}\n\n.zeon-form textarea {\n  width: 100%;\n  min-height: 80px;\n  max-height: 360px;\n  padding: 9px 11px;\n  border: 1px solid var(--zeon-border);\n  border-radius: var(--zeon-radius-sm);\n  font-family: inherit;\n  font-size: 13px;\n  line-height: 1.55;\n  resize: none;\n  overflow-y: hidden;\n  background: var(--zeon-bg);\n  color: var(--zeon-text);\n  transition: border-color 0.12s, box-shadow 0.12s;\n  display: block;\n}\n\n.zeon-form textarea:focus {\n  outline: none;\n  border-color: var(--zeon-primary);\n  box-shadow: 0 0 0 3px color-mix(in srgb, var(--zeon-primary) 12%, transparent);\n}\n\n.zeon-form textarea::placeholder {\n  color: var(--zeon-muted);\n}\n\n.zeon-form textarea:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n.zeon-form-footer {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.zeon-char-counter {\n  font-size: 11px;\n  color: var(--zeon-muted);\n  font-variant-numeric: tabular-nums;\n  transition: color 0.12s;\n}\n\n.zeon-char-counter-warn {\n  color: #f59e0b;\n}\n\n.zeon-char-counter-over {\n  color: #ef4444;\n  font-weight: 600;\n}\n\n/* Reply indicator */\n.zeon-reply-indicator {\n  padding: 6px 10px 6px 12px;\n  background: var(--zeon-accent);\n  border: 1px solid var(--zeon-border);\n  border-left: 3px solid var(--zeon-primary);\n  border-radius: var(--zeon-radius-sm);\n  font-size: 12px;\n  color: var(--zeon-muted);\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\n\n.zeon-reply-indicator strong {\n  color: var(--zeon-text);\n  font-weight: 600;\n}\n\n.zeon-reply-indicator-cancel {\n  margin-left: auto;\n  background: none;\n  border: none;\n  cursor: pointer;\n  color: var(--zeon-muted);\n  padding: 2px 4px;\n  border-radius: 4px;\n  font-size: 14px;\n  line-height: 1;\n  font-family: inherit;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.zeon-reply-indicator-cancel:hover {\n  background: var(--zeon-border);\n  color: var(--zeon-text);\n}\n\n/* \u2500\u2500\u2500 Comments list \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-list {\n  list-style: none;\n}\n\n/* Empty state */\n.zeon-empty {\n  padding: 40px 16px;\n  text-align: center;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 10px;\n}\n\n.zeon-empty-icon {\n  width: 40px;\n  height: 40px;\n  color: var(--zeon-border);\n  opacity: 0.8;\n}\n\n.zeon-empty-title {\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--zeon-text);\n}\n\n.zeon-empty-desc {\n  font-size: 13px;\n  color: var(--zeon-muted);\n}\n\n/* \u2500\u2500\u2500 Comment item \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-comment {\n  padding: 14px 16px;\n  border-bottom: 1px solid var(--zeon-border);\n}\n\n.zeon-comment:last-child {\n  border-bottom: none;\n}\n\n.zeon-comment-meta {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 6px;\n}\n\n.zeon-comment-author {\n  font-weight: 600;\n  font-size: 13px;\n  color: var(--zeon-text);\n}\n\n.zeon-comment-time {\n  font-size: 12px;\n  color: var(--zeon-muted);\n  margin-left: auto;\n}\n\n.zeon-comment-body {\n  font-size: 13.5px;\n  line-height: 1.65;\n  color: var(--zeon-text);\n  white-space: pre-wrap;\n  word-break: break-word;\n  overflow-wrap: break-word;\n  padding-left: 38px; /* align under author name */\n}\n\n.zeon-comment-actions {\n  margin-top: 6px;\n  padding-left: 38px;\n  display: flex;\n  gap: 4px;\n}\n\n/* \u2500\u2500\u2500 Replies \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-replies {\n  margin-top: 12px;\n  margin-left: 38px;\n  padding-left: 14px;\n  border-left: 2px solid var(--zeon-border);\n  list-style: none;\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n}\n\n.zeon-reply {\n  padding: 10px 0;\n  border-bottom: 1px solid var(--zeon-border);\n}\n\n.zeon-reply:last-child {\n  border-bottom: none;\n  padding-bottom: 2px;\n}\n\n.zeon-reply .zeon-comment-body {\n  padding-left: 32px;\n}\n\n.zeon-reply .zeon-comment-meta {\n  margin-bottom: 4px;\n}\n\n/* \u2500\u2500\u2500 Pending badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-pending-badge {\n  display: inline-flex;\n  align-items: center;\n  padding: 1px 7px;\n  border-radius: 99px;\n  font-size: 11px;\n  font-weight: 500;\n  background: color-mix(in srgb, #f59e0b 12%, var(--zeon-bg));\n  color: #b45309;\n  border: 1px solid color-mix(in srgb, #f59e0b 25%, transparent);\n  margin-left: 2px;\n}\n\n@media (prefers-color-scheme: dark) {\n  :host .zeon-pending-badge {\n    background: color-mix(in srgb, #f59e0b 15%, transparent);\n    color: #fbbf24;\n    border-color: color-mix(in srgb, #f59e0b 30%, transparent);\n  }\n}\n\n/* \u2500\u2500\u2500 Loading skeleton \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-loading {\n  padding: 0;\n  list-style: none;\n}\n\n/* Auth bar placeholder shown during load */\n.zeon-skeleton-authbar {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 10px 16px;\n  border-bottom: 1px solid var(--zeon-border);\n  background: var(--zeon-subtle);\n  min-height: 48px;\n}\n\n.zeon-skeleton-item {\n  padding: 14px 16px;\n  border-bottom: 1px solid var(--zeon-border);\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.zeon-skeleton-item:last-child {\n  border-bottom: none;\n}\n\n/* Meta row: avatar | name | spacer | timestamp */\n.zeon-skeleton-meta {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.zeon-skeleton-spacer {\n  flex: 1;\n}\n\n.zeon-skeleton {\n  background: linear-gradient(\n    90deg,\n    var(--zeon-skel-base) 25%,\n    var(--zeon-skel-glow) 50%,\n    var(--zeon-skel-base) 75%\n  );\n  background-size: 300% 100%;\n  border-radius: 4px;\n  animation: zeon-shimmer 1.8s ease-in-out infinite;\n}\n\n@keyframes zeon-shimmer {\n  0%   { background-position: 100% 0; }\n  100% { background-position: -100% 0; }\n}\n\n.zeon-skeleton-avatar {\n  width: 30px;\n  height: 30px;\n  border-radius: 50%;\n  flex-shrink: 0;\n}\n\n.zeon-skeleton-name {\n  height: 11px;\n  border-radius: 4px;\n}\n\n.zeon-skeleton-time {\n  height: 10px;\n  width: 44px;\n  border-radius: 4px;\n  flex-shrink: 0;\n}\n\n.zeon-skeleton-line {\n  height: 11px;\n  border-radius: 4px;\n  margin-left: 38px;\n}\n\n/* \u2500\u2500\u2500 Error \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.zeon-error {\n  padding: 10px 16px;\n  background: color-mix(in srgb, #ef4444 10%, var(--zeon-bg));\n  color: #b91c1c;\n  font-size: 13px;\n  border-bottom: 1px solid color-mix(in srgb, #ef4444 20%, transparent);\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n@media (prefers-color-scheme: dark) {\n  :host .zeon-error {\n    color: #fca5a5;\n  }\n}\n\n/* \u2500\u2500\u2500 Accessibility \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n@media (prefers-reduced-motion: reduce) {\n  .zeon-btn,\n  .zeon-form textarea {\n    transition: none;\n  }\n  .zeon-skeleton {\n    animation: none;\n    background: var(--zeon-subtle);\n  }\n}\n';
      this.shadow.appendChild(style);
      this.themeStyle = document.createElement("style");
      const cached = loadCachedTheme(config.siteKey);
      if (cached) this.themeStyle.textContent = buildThemeStyle(cached);
      this.shadow.appendChild(this.themeStyle);
      this.root = document.createElement("div");
      this.root.className = "zeon-root";
      this.shadow.appendChild(this.root);
      this.render();
      this.loadComments();
    }
    async loadComments() {
      this.renderLoadingState();
      try {
        const { comments, config: themeConfig } = await fetchComments(
          this.config.appUrl,
          this.config.siteKey,
          this.config.slug
        );
        this.themeStyle.textContent = buildThemeStyle(themeConfig);
        saveCachedTheme(this.config.siteKey, themeConfig);
        this.comments = comments;
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
      const header = document.createElement("div");
      header.className = "zeon-header";
      const titleSkel = document.createElement("div");
      titleSkel.className = "zeon-skeleton zeon-skeleton-name";
      titleSkel.style.width = "80px";
      titleSkel.style.height = "14px";
      titleSkel.setAttribute("aria-hidden", "true");
      header.appendChild(titleSkel);
      this.root.appendChild(header);
      this.root.appendChild(renderLoadingAuthBar());
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

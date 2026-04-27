"use strict"
;(() => {
  // widget/src/api.ts
  async function fetchComments(appUrl, siteKey, slug) {
    const url = `${appUrl}/api/widget/comments?siteKey=${encodeURIComponent(siteKey)}&slug=${encodeURIComponent(slug)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error("Failed to fetch comments")
    return res.json()
  }
  async function postComment(appUrl, token, payload) {
    const res = await fetch(`${appUrl}/api/widget/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? "Failed to post comment")
    }
    return res.json()
  }
  async function exchangeGoogleToken(appUrl, idToken) {
    const res = await fetch(`${appUrl}/api/widget/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })
    if (!res.ok) throw new Error("Auth failed")
    const { token } = await res.json()
    return token
  }

  // widget/src/auth.ts
  var STORAGE_KEY = "zeon_widget_token"
  function loadStoredAuth() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return { status: "idle" }
      const parsed = JSON.parse(raw)
      if (Date.now() > parsed.exp) {
        sessionStorage.removeItem(STORAGE_KEY)
        return { status: "idle" }
      }
      return { status: "authenticated", token: parsed.token, user: parsed.user }
    } catch {
      return { status: "idle" }
    }
  }
  function saveAuth(token, user) {
    const exp = Date.now() + 7 * 24 * 60 * 60 * 1e3
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, exp }))
  }
  function clearAuth() {
    sessionStorage.removeItem(STORAGE_KEY)
  }
  async function signInWithGoogle(appUrl, googleClientId) {
    return new Promise((resolve, reject) => {
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      const popup = window.open(
        `https://accounts.google.com/o/oauth2/v2/auth?` +
          new URLSearchParams({
            client_id: googleClientId,
            redirect_uri: `${appUrl}/api/widget/oauth-callback`,
            response_type: "id_token",
            scope: "openid email profile",
            nonce: Math.random().toString(36).slice(2),
            prompt: "select_account",
          }),
        "zeon-google-signin",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      )
      if (!popup) {
        reject(new Error("Popup blocked. Please allow popups for this site."))
        return
      }
      const handler = async (e) => {
        if (e.origin !== appUrl) return
        if (e.data?.type !== "ZEON_GOOGLE_TOKEN") return
        window.removeEventListener("message", handler)
        popup.close()
        try {
          const idToken = e.data.idToken
          const token = await exchangeGoogleToken(appUrl, idToken)
          const payload = JSON.parse(atob(token.split(".")[1]))
          const user = {
            email: payload.sub,
            name: payload.name,
            image: payload.image,
          }
          saveAuth(token, user)
          resolve({ token, user })
        } catch (err) {
          reject(err)
        }
      }
      window.addEventListener("message", handler)
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer)
          window.removeEventListener("message", handler)
          reject(new Error("Sign-in cancelled"))
        }
      }, 500)
    })
  }

  // widget/src/render.ts
  function formatRelativeTime(isoDate) {
    const diff = Date.now() - new Date(isoDate).getTime()
    const mins = Math.floor(diff / 6e4)
    const hours = Math.floor(diff / 36e5)
    const days = Math.floor(diff / 864e5)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 30) return `${days}d ago`
    return new Intl.DateTimeFormat(void 0, {
      month: "short",
      day: "numeric",
    }).format(new Date(isoDate))
  }
  function avatarEl(name, image) {
    if (image) {
      const img = document.createElement("img")
      img.src = image
      img.alt = name
      img.className = "zeon-avatar"
      img.width = 28
      img.height = 28
      return img
    }
    const el = document.createElement("div")
    el.className = "zeon-avatar-placeholder"
    el.setAttribute("aria-hidden", "true")
    el.textContent = name.slice(0, 2).toUpperCase()
    return el
  }
  function renderCommentItem(comment, depth, onReply) {
    const li = document.createElement("li")
    li.className = depth === 0 ? "zeon-comment" : "zeon-reply"
    li.dataset.id = comment.id
    const meta = document.createElement("div")
    meta.className = "zeon-comment-meta"
    meta.appendChild(avatarEl(comment.authorName, comment.authorImage))
    const authorEl = document.createElement("span")
    authorEl.className = "zeon-comment-author"
    authorEl.textContent = comment.authorName
    meta.appendChild(authorEl)
    const timeEl = document.createElement("time")
    timeEl.className = "zeon-comment-time"
    timeEl.dateTime = comment.createdAt
    timeEl.textContent = formatRelativeTime(comment.createdAt)
    meta.appendChild(timeEl)
    if (comment.status === "PENDING") {
      const badge = document.createElement("span")
      badge.className = "zeon-pending-badge"
      badge.textContent = "Pending review"
      meta.appendChild(badge)
    }
    li.appendChild(meta)
    const body = document.createElement("p")
    body.className = "zeon-comment-body"
    body.textContent = comment.body
    li.appendChild(body)
    if (depth === 0) {
      const actions = document.createElement("div")
      actions.className = "zeon-comment-actions"
      const replyBtn = document.createElement("button")
      replyBtn.className = "zeon-btn zeon-btn-ghost zeon-btn-sm"
      replyBtn.textContent = "Reply"
      replyBtn.type = "button"
      replyBtn.addEventListener("click", () => onReply(comment))
      actions.appendChild(replyBtn)
      li.appendChild(actions)
    }
    if (comment.replies?.length > 0) {
      const repliesList = document.createElement("ul")
      repliesList.className = "zeon-replies"
      repliesList.setAttribute("aria-label", `Replies to ${comment.authorName}`)
      for (const reply of comment.replies) {
        repliesList.appendChild(renderCommentItem(reply, depth + 1, onReply))
      }
      li.appendChild(repliesList)
    }
    return li
  }
  function renderCommentList(comments, onReply) {
    if (comments.length === 0) {
      const el = document.createElement("div")
      el.className = "zeon-empty"
      el.textContent = "No comments yet. Be the first to comment!"
      return el
    }
    const list = document.createElement("ul")
    list.className = "zeon-list"
    list.setAttribute("aria-label", "Comments")
    for (const c of comments) {
      list.appendChild(renderCommentItem(c, 0, onReply))
    }
    return list
  }
  function renderAuthBar(auth, onSignIn, onSignOut) {
    const bar = document.createElement("div")
    bar.className = "zeon-auth-bar"
    if (auth.status === "authenticated") {
      bar.appendChild(avatarEl(auth.user.name, auth.user.image))
      const name = document.createElement("span")
      name.className = "zeon-user-name"
      name.textContent = auth.user.name
      bar.appendChild(name)
      const signOutBtn = document.createElement("button")
      signOutBtn.className = "zeon-btn zeon-btn-ghost zeon-btn-sm"
      signOutBtn.textContent = "Sign out"
      signOutBtn.type = "button"
      signOutBtn.addEventListener("click", onSignOut)
      bar.appendChild(signOutBtn)
    } else {
      const label = document.createElement("span")
      label.style.flex = "1"
      label.style.color = "var(--zeon-muted)"
      label.style.fontSize = "13px"
      label.textContent = "Sign in to leave a comment"
      bar.appendChild(label)
      const signInBtn = document.createElement("button")
      signInBtn.className = "zeon-btn zeon-btn-google"
      signInBtn.type = "button"
      signInBtn.disabled = auth.status === "loading"
      signInBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>${auth.status === "loading" ? "Signing in\u2026" : "Continue with Google"}`
      signInBtn.addEventListener("click", onSignIn)
      bar.appendChild(signInBtn)
    }
    return bar
  }
  function renderCommentForm(onSubmit, replyTo, onCancelReply, isSubmitting) {
    const form = document.createElement("div")
    form.className = "zeon-form"
    if (replyTo) {
      const indicator = document.createElement("div")
      indicator.className = "zeon-reply-indicator"
      indicator.innerHTML = `Replying to <strong>${replyTo.authorName}</strong>`
      const cancelBtn = document.createElement("button")
      cancelBtn.type = "button"
      cancelBtn.setAttribute("aria-label", "Cancel reply")
      cancelBtn.textContent = "\u2715"
      cancelBtn.addEventListener("click", onCancelReply)
      indicator.appendChild(cancelBtn)
      form.appendChild(indicator)
    }
    const textarea = document.createElement("textarea")
    textarea.placeholder = "Write a comment\u2026"
    textarea.setAttribute(
      "aria-label",
      replyTo ? `Reply to ${replyTo.authorName}` : "Write a comment"
    )
    textarea.rows = 3
    textarea.disabled = isSubmitting
    form.appendChild(textarea)
    const actions = document.createElement("div")
    actions.className = "zeon-form-actions"
    const submitBtn = document.createElement("button")
    submitBtn.className = "zeon-btn zeon-btn-primary"
    submitBtn.type = "button"
    submitBtn.textContent = isSubmitting
      ? "Posting\u2026"
      : replyTo
        ? "Post reply"
        : "Post comment"
    submitBtn.disabled = isSubmitting
    submitBtn.addEventListener("click", async () => {
      const body = textarea.value.trim()
      if (!body) {
        textarea.focus()
        return
      }
      await onSubmit(body, replyTo?.id)
      textarea.value = ""
    })
    actions.appendChild(submitBtn)
    form.appendChild(actions)
    return form
  }
  function renderError(message) {
    const el = document.createElement("div")
    el.className = "zeon-error"
    el.setAttribute("role", "alert")
    el.textContent = message
    return el
  }
  function renderLoading() {
    const el = document.createElement("div")
    el.className = "zeon-loading"
    el.setAttribute("aria-live", "polite")
    el.textContent = "Loading comments\u2026"
    return el
  }

  // widget/src/index.ts
  var ZeonWidget = class {
    constructor(config) {
      this.comments = []
      this.replyTo = null
      this.isSubmitting = false
      this.config = config
      this.shadow = config.container.attachShadow({ mode: "open" })
      this.auth = loadStoredAuth()
      const style = document.createElement("style")
      style.textContent =
        '/* Zeon Comments Widget \u2014 scoped inside shadow DOM */\n:host {\n  display: block;\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n  font-size: 14px;\n  line-height: 1.6;\n  color: var(--zeon-text, #0f172a);\n  --zeon-bg: #ffffff;\n  --zeon-border: #e2e8f0;\n  --zeon-muted: #64748b;\n  --zeon-primary: #0f172a;\n  --zeon-primary-fg: #ffffff;\n  --zeon-radius: 8px;\n  --zeon-avatar-bg: #e2e8f0;\n}\n\n@media (prefers-color-scheme: dark) {\n  :host {\n    --zeon-text: #f8fafc;\n    --zeon-bg: #0f172a;\n    --zeon-border: #1e293b;\n    --zeon-muted: #94a3b8;\n    --zeon-primary: #f8fafc;\n    --zeon-primary-fg: #0f172a;\n    --zeon-avatar-bg: #1e293b;\n  }\n}\n\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\n.zeon-root {\n  background: var(--zeon-bg);\n  border: 1px solid var(--zeon-border);\n  border-radius: var(--zeon-radius);\n  overflow: hidden;\n}\n\n/* Header */\n.zeon-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 12px 16px;\n  border-bottom: 1px solid var(--zeon-border);\n}\n\n.zeon-header h2 {\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--zeon-text);\n}\n\n/* Auth bar */\n.zeon-auth-bar {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 12px 16px;\n  border-bottom: 1px solid var(--zeon-border);\n  background: var(--zeon-bg);\n}\n\n.zeon-avatar {\n  width: 28px;\n  height: 28px;\n  border-radius: 50%;\n  background: var(--zeon-avatar-bg);\n  object-fit: cover;\n  flex-shrink: 0;\n}\n\n.zeon-avatar-placeholder {\n  width: 28px;\n  height: 28px;\n  border-radius: 50%;\n  background: var(--zeon-avatar-bg);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 11px;\n  font-weight: 600;\n  color: var(--zeon-muted);\n  flex-shrink: 0;\n}\n\n.zeon-user-name {\n  font-size: 13px;\n  font-weight: 500;\n  flex: 1;\n  color: var(--zeon-text);\n}\n\n/* Buttons */\n.zeon-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 6px 12px;\n  border-radius: 6px;\n  font-size: 13px;\n  font-weight: 500;\n  cursor: pointer;\n  border: 1px solid transparent;\n  transition: opacity 0.15s, background-color 0.15s;\n  font-family: inherit;\n  touch-action: manipulation;\n}\n\n.zeon-btn:focus-visible {\n  outline: 2px solid var(--zeon-primary);\n  outline-offset: 2px;\n}\n\n.zeon-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n.zeon-btn-primary {\n  background: var(--zeon-primary);\n  color: var(--zeon-primary-fg);\n}\n\n.zeon-btn-primary:hover:not(:disabled) {\n  opacity: 0.9;\n}\n\n.zeon-btn-ghost {\n  background: transparent;\n  color: var(--zeon-muted);\n  border-color: var(--zeon-border);\n}\n\n.zeon-btn-ghost:hover:not(:disabled) {\n  background: var(--zeon-border);\n  color: var(--zeon-text);\n}\n\n.zeon-btn-sm {\n  padding: 4px 8px;\n  font-size: 12px;\n}\n\n/* Google button */\n.zeon-btn-google {\n  background: #fff;\n  color: #374151;\n  border-color: #d1d5db;\n  font-size: 13px;\n}\n\n.zeon-btn-google:hover:not(:disabled) {\n  background: #f9fafb;\n}\n\n/* Comment form */\n.zeon-form {\n  padding: 12px 16px;\n  border-bottom: 1px solid var(--zeon-border);\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.zeon-form textarea {\n  width: 100%;\n  min-height: 80px;\n  padding: 8px 10px;\n  border: 1px solid var(--zeon-border);\n  border-radius: 6px;\n  font-family: inherit;\n  font-size: 13px;\n  line-height: 1.5;\n  resize: vertical;\n  background: var(--zeon-bg);\n  color: var(--zeon-text);\n  transition: border-color 0.15s;\n}\n\n.zeon-form textarea:focus {\n  outline: none;\n  border-color: var(--zeon-primary);\n}\n\n.zeon-form textarea::placeholder {\n  color: var(--zeon-muted);\n}\n\n.zeon-form-actions {\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 8px;\n}\n\n/* Reply form indicator */\n.zeon-reply-indicator {\n  padding: 6px 10px;\n  background: var(--zeon-avatar-bg);\n  border-radius: 4px;\n  font-size: 12px;\n  color: var(--zeon-muted);\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\n\n.zeon-reply-indicator button {\n  background: none;\n  border: none;\n  cursor: pointer;\n  color: var(--zeon-muted);\n  padding: 0;\n  font-size: 14px;\n  line-height: 1;\n}\n\n/* Comments list */\n.zeon-list {\n  list-style: none;\n}\n\n.zeon-empty {\n  padding: 32px 16px;\n  text-align: center;\n  color: var(--zeon-muted);\n  font-size: 13px;\n}\n\n/* Comment item */\n.zeon-comment {\n  padding: 14px 16px;\n  border-bottom: 1px solid var(--zeon-border);\n}\n\n.zeon-comment:last-child {\n  border-bottom: none;\n}\n\n.zeon-comment-meta {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 8px;\n}\n\n.zeon-comment-author {\n  font-weight: 600;\n  font-size: 13px;\n  color: var(--zeon-text);\n}\n\n.zeon-comment-time {\n  font-size: 12px;\n  color: var(--zeon-muted);\n}\n\n.zeon-comment-body {\n  font-size: 14px;\n  line-height: 1.6;\n  color: var(--zeon-text);\n  white-space: pre-wrap;\n  word-break: break-word;\n  overflow-wrap: break-word;\n}\n\n.zeon-comment-actions {\n  margin-top: 8px;\n  display: flex;\n  gap: 4px;\n}\n\n/* Replies */\n.zeon-replies {\n  margin-top: 10px;\n  margin-left: 36px;\n  padding-left: 12px;\n  border-left: 2px solid var(--zeon-border);\n  list-style: none;\n}\n\n.zeon-reply {\n  padding: 10px 0;\n  border-bottom: 1px solid var(--zeon-border);\n}\n\n.zeon-reply:last-child {\n  border-bottom: none;\n}\n\n/* Pending badge */\n.zeon-pending-badge {\n  display: inline-block;\n  padding: 1px 6px;\n  border-radius: 4px;\n  font-size: 11px;\n  background: #fef3c7;\n  color: #92400e;\n  margin-left: 4px;\n}\n\n/* Loading + error */\n.zeon-loading {\n  padding: 24px 16px;\n  text-align: center;\n  color: var(--zeon-muted);\n  font-size: 13px;\n}\n\n.zeon-error {\n  padding: 12px 16px;\n  background: #fef2f2;\n  color: #991b1b;\n  font-size: 13px;\n  border-bottom: 1px solid var(--zeon-border);\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .zeon-btn { transition: none; }\n  .zeon-form textarea { transition: none; }\n}\n'
      this.shadow.appendChild(style)
      this.root = document.createElement("div")
      this.root.className = "zeon-root"
      this.shadow.appendChild(this.root)
      this.render()
      this.loadComments()
    }
    async loadComments() {
      this.renderLoading()
      try {
        this.comments = await fetchComments(
          this.config.appUrl,
          this.config.siteKey,
          this.config.slug
        )
        this.render()
      } catch {
        this.renderErrorState(
          "Failed to load comments. Please try again later."
        )
      }
    }
    async handleSignIn() {
      this.auth = { status: "loading" }
      this.render()
      try {
        const googleClientId = ""
        const { token, user } = await signInWithGoogle(
          this.config.appUrl,
          googleClientId
        )
        this.auth = { status: "authenticated", token, user }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign-in failed"
        this.auth = { status: "error", message }
        setTimeout(() => {
          this.auth = { status: "idle" }
          this.render()
        }, 3e3)
      }
      this.render()
    }
    handleSignOut() {
      clearAuth()
      this.auth = { status: "idle" }
      this.replyTo = null
      this.render()
    }
    async handleSubmit(body, parentId) {
      if (this.auth.status !== "authenticated") return
      this.isSubmitting = true
      this.render()
      try {
        const comment = await postComment(this.config.appUrl, this.auth.token, {
          body,
          siteKey: this.config.siteKey,
          slug: this.config.slug,
          parentId,
        })
        if (parentId) {
          const parent = this.comments.find((c) => c.id === parentId)
          if (parent) {
            parent.replies = [...(parent.replies ?? []), comment]
          }
        } else {
          this.comments = [...this.comments, comment]
        }
        this.replyTo = null
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to post"
        this.renderErrorBanner(message)
      } finally {
        this.isSubmitting = false
        this.render()
      }
    }
    renderLoading() {
      this.root.innerHTML = ""
      this.root.appendChild(renderLoading())
    }
    renderErrorState(message) {
      this.root.innerHTML = ""
      this.root.appendChild(renderError(message))
    }
    renderErrorBanner(message) {
      const existing = this.root.querySelector(".zeon-error")
      if (existing) existing.remove()
      const banner = renderError(message)
      this.root.insertBefore(banner, this.root.firstChild)
      setTimeout(() => banner.remove(), 4e3)
    }
    render() {
      this.root.innerHTML = ""
      const header = document.createElement("div")
      header.className = "zeon-header"
      const heading = document.createElement("h2")
      const count = this.comments.length
      heading.textContent = `${count} Comment${count !== 1 ? "s" : ""}`
      header.appendChild(heading)
      this.root.appendChild(header)
      if (this.auth.status === "error") {
        this.root.appendChild(renderError(this.auth.message))
      }
      this.root.appendChild(
        renderAuthBar(
          this.auth,
          () => this.handleSignIn(),
          () => this.handleSignOut()
        )
      )
      if (this.auth.status === "authenticated") {
        this.root.appendChild(
          renderCommentForm(
            (body, parentId) => this.handleSubmit(body, parentId),
            this.replyTo,
            () => {
              this.replyTo = null
              this.render()
            },
            this.isSubmitting
          )
        )
      }
      this.root.appendChild(
        renderCommentList(this.comments, (comment) => {
          if (this.auth.status !== "authenticated") {
            this.handleSignIn()
            return
          }
          this.replyTo = comment
          this.render()
          const form = this.shadow.querySelector(".zeon-form")
          form?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        })
      )
    }
  }
  function mount() {
    const appUrl = "https://zeon-comments.vercel.app"
    const elements = document.querySelectorAll("[data-zeon-comments]")
    for (const el of elements) {
      const siteKey = el.dataset.siteKey
      const slug = el.dataset.slug
      if (!siteKey || !slug) {
        console.warn("[Zeon Comments] Missing data-site-key or data-slug", el)
        continue
      }
      new ZeonWidget({ siteKey, slug, container: el, appUrl })
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount)
  } else {
    mount()
  }
  window.ZeonComments = { mount }
})()

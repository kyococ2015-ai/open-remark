import type {
  AuthState,
  CommentData,
  WidgetConfig,
  WidgetThemeConfig,
} from "./types";
import { fetchComments, postComment } from "./api";
import { loadStoredAuth, signInWithGoogle, clearAuth } from "./auth";
import {
  renderAuthBar,
  renderCommentForm,
  renderCommentList,
  renderError,
  renderLoading,
  renderLoadingAuthBar,
} from "./render";

// Injected by esbuild define
declare const __APP_URL__: string;
declare const __GOOGLE_CLIENT_ID__: string;
declare const __STYLES__: string;

/**
 * Pick a readable foreground for a given hex background.
 * Used so the "Post comment" button text stays legible against any
 * primaryColor the dashboard owner picks.
 */
function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0f172a" : "#ffffff";
}

/**
 * Build the per-site `:host { ... }` override that applies the dashboard
 * appearance settings. Theme=DARK forces the dark palette; theme=LIGHT
 * forces the light palette; theme=AUTO leaves prefers-color-scheme alone.
 * Always applies primaryColor and radius.
 */
function buildThemeStyle(cfg: WidgetThemeConfig): string {
  const lines: string[] = [];

  if (cfg.theme === "DARK") {
    lines.push(`:host {
  --z-bg: #0f172a;
  --z-text: #f8fafc;
  --z-border: #1e293b;
  --z-muted: #94a3b8;
  --z-subtle: #1e293b;
  --z-accent: #1e293b;
  --z-skel-base: #1e293b;
  --z-skel-glow: #334155;
}`);
  } else if (cfg.theme === "LIGHT") {
    // Override the prefers-color-scheme dark fallback
    lines.push(`:host {
  --z-bg: #ffffff;
  --z-text: #0f172a;
  --z-border: #e2e8f0;
  --z-muted: #64748b;
  --z-subtle: #f1f5f9;
  --z-accent: #f1f5f9;
  --z-skel-base: #e8edf2;
  --z-skel-glow: #f8fafc;
}`);
  }

  lines.push(`:host {
  --z-primary: ${cfg.primaryColor};
  --z-primary-fg: ${readableOn(cfg.primaryColor)};
  --z-radius: ${cfg.radius}px;
}`);

  return lines.join("\n");
}

// ─── Theme cache (localStorage) ───────────────────────────────────────────
// Apply saved theme immediately in the constructor so the skeleton renders
// with the correct colours before the API call completes.

function themeKey(siteKey: string) {
  return `zeon_theme_${siteKey}`;
}

function loadCachedTheme(siteKey: string): WidgetThemeConfig | null {
  try {
    const raw = localStorage.getItem(themeKey(siteKey));
    return raw ? (JSON.parse(raw) as WidgetThemeConfig) : null;
  } catch {
    return null;
  }
}

function saveCachedTheme(siteKey: string, cfg: WidgetThemeConfig) {
  try {
    localStorage.setItem(themeKey(siteKey), JSON.stringify(cfg));
  } catch { /* storage quota / private mode */ }
}

class ZeonWidget {
  private config: WidgetConfig;
  private shadow: ShadowRoot;
  private root: HTMLElement;
  private themeStyle: HTMLStyleElement;
  private auth: AuthState;
  private comments: CommentData[] = [];
  private replyTo: CommentData | null = null;
  private isSubmitting = false;

  constructor(config: WidgetConfig) {
    this.config = config;
    this.shadow = config.container.attachShadow({ mode: "open" });
    this.auth = loadStoredAuth();

    // Base styles
    const style = document.createElement("style");
    style.textContent = __STYLES__;
    this.shadow.appendChild(style);

    // Theme overrides — populated from cache immediately, then refreshed after fetch
    this.themeStyle = document.createElement("style");
    const cached = loadCachedTheme(config.siteKey);
    if (cached) this.themeStyle.textContent = buildThemeStyle(cached);
    this.shadow.appendChild(this.themeStyle);

    this.root = document.createElement("div");
    this.root.className = "z-root";
    this.shadow.appendChild(this.root);

    this.render();
    this.loadComments();
  }

  private async loadComments() {
    this.renderLoadingState();
    try {
      const { comments, config: themeConfig } = await fetchComments(
        this.config.appUrl,
        this.config.siteKey,
        this.config.slug,
      );
      // Update theme + persist for next page load
      this.themeStyle.textContent = buildThemeStyle(themeConfig);
      saveCachedTheme(this.config.siteKey, themeConfig);
      this.comments = comments;
      this.render();
    } catch {
      this.renderErrorState("Failed to load comments. Please try again later.");
    }
  }

  private async handleSignIn() {
    this.auth = { status: "loading" };
    this.render();
    try {
      const googleClientId = __GOOGLE_CLIENT_ID__;
      const { token, user } = await signInWithGoogle(this.config.appUrl, googleClientId);
      this.auth = { status: "authenticated", token, user };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      this.auth = { status: "error", message };
      setTimeout(() => {
        this.auth = { status: "idle" };
        this.render();
      }, 3000);
    }
    this.render();
  }

  private handleSignOut() {
    clearAuth();
    this.auth = { status: "idle" };
    this.replyTo = null;
    this.render();
  }

  private async handleSubmit(body: string, parentId?: string) {
    if (this.auth.status !== "authenticated") return;
    this.isSubmitting = true;
    this.render();
    try {
      const comment = await postComment(this.config.appUrl, this.auth.token, {
        body,
        siteKey: this.config.siteKey,
        slug: this.config.slug,
        parentId,
      });
      if (parentId) {
        const parent = this.comments.find((c) => c.id === parentId);
        if (parent) {
          parent.replies = [...(parent.replies ?? []), comment];
        }
      } else {
        this.comments = [...this.comments, comment];
      }
      this.replyTo = null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to post";
      this.renderErrorBanner(message);
    } finally {
      this.isSubmitting = false;
      this.render();
    }
  }

  private renderLoadingState() {
    this.root.innerHTML = "";

    // Header with skeleton title instead of "0 Comments"
    const header = document.createElement("div");
    header.className = "z-header";
    const titleSkel = document.createElement("div");
    titleSkel.className = "z-skeleton z-skeleton-name";
    titleSkel.style.width = "80px";
    titleSkel.style.height = "14px";
    titleSkel.setAttribute("aria-hidden", "true");
    header.appendChild(titleSkel);
    this.root.appendChild(header);

    this.root.appendChild(renderLoadingAuthBar());
    this.root.appendChild(renderLoading());
  }

  private renderErrorState(message: string) {
    this.root.innerHTML = "";
    this.root.appendChild(renderError(message));
  }

  private renderErrorBanner(message: string) {
    const existing = this.root.querySelector(".z-error");
    if (existing) existing.remove();
    const banner = renderError(message);
    this.root.insertBefore(banner, this.root.firstChild);
    setTimeout(() => banner.remove(), 4000);
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "z-header";
    const heading = document.createElement("h2");
    const count = this.comments.length;
    heading.textContent = `${count} Comment${count !== 1 ? "s" : ""}`;
    header.appendChild(heading);
    return header;
  }

  private render() {
    this.root.innerHTML = "";

    this.root.appendChild(this.buildHeader());

    if (this.auth.status === "error") {
      this.root.appendChild(renderError(this.auth.message));
    }

    this.root.appendChild(
      renderAuthBar(
        this.auth,
        () => this.handleSignIn(),
        () => this.handleSignOut(),
      ),
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
          this.isSubmitting,
        ),
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
        const form = this.shadow.querySelector(".z-form");
        form?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }),
    );
  }
}

function detectAppUrl(): string {
  const script = document.currentScript as HTMLScriptElement | null;
  if (script?.src) {
    const url = new URL(script.src);
    return `${url.protocol}//${url.host}`;
  }
  return __APP_URL__;
}

function mount() {
  const appUrl = detectAppUrl();
  const elements = document.querySelectorAll<HTMLElement>("[data-zeon-comments]");

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

// Expose for manual init
(window as unknown as Record<string, unknown>).ZeonComments = { mount };

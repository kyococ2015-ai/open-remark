import type { AuthState, CommentData, WidgetConfig } from "./types";
import { fetchComments, postComment } from "./api";
import { loadStoredAuth, signInWithGoogle, clearAuth } from "./auth";
import {
  renderAuthBar,
  renderCommentForm,
  renderCommentList,
  renderError,
  renderLoading,
} from "./render";

// Injected by esbuild define
declare const __APP_URL__: string;
declare const __GOOGLE_CLIENT_ID__: string;
declare const __STYLES__: string;

/**
 * Attempt to read the host page's CSS variables and map them to zeon vars.
 *
 * Priority:
 *   1. shadcn/Tailwind v4 — variables are full color values (oklch, hsl, hex)
 *      → CSS var() inheritance in :host handles it automatically; return null.
 *   2. shadcn/Tailwind v3 — variables are bare HSL components ("h s% l%")
 *      → Wrap in hsl() and inject explicit overrides.
 *   3. Bootstrap 5 — --bs-body-bg / --bs-body-color
 *      → Map to zeon vars.
 *   4. Computed body background luminance
 *      → Force dark theme if the page is dark.
 *   5. null → let CSS defaults + @media prefers-color-scheme handle it.
 */
function detectHostTheme(host: HTMLElement): string | null {
  const cs = getComputedStyle(document.documentElement);
  const get = (v: string) => cs.getPropertyValue(v).trim();

  const bg = get("--background");

  // Shadcn v4 / any modern CSS var: direct color values flow in via CSS inheritance
  if (bg && /oklch|hsl\(|rgb\(|#[0-9a-f]/i.test(bg)) {
    host.setAttribute("data-theme-detected", "");
    return null; // CSS var() chain in :host handles it
  }

  // Shadcn v3: bare HSL components like "222.2 84% 4.9%"
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
    const lines: string[] = [":host {"];
    if (bg)       lines.push(`  --zeon-bg: hsl(${bg});`);
    if (fg)       lines.push(`  --zeon-text: hsl(${fg});`);
    if (border)   lines.push(`  --zeon-border: hsl(${border});`);
    if (mutedFg)  lines.push(`  --zeon-muted: hsl(${mutedFg});`);
    if (primary)  lines.push(`  --zeon-primary: hsl(${primary});`);
    if (primaryFg)lines.push(`  --zeon-primary-fg: hsl(${primaryFg});`);
    if (muted)    lines.push(`  --zeon-subtle: hsl(${muted});`);
    if (accent)   lines.push(`  --zeon-accent: hsl(${accent});`);
    if (radius)   lines.push(`  --zeon-radius: ${radius};`);
    lines.push("}");
    return lines.join("\n");
  }

  // Bootstrap 5
  const bsBg = get("--bs-body-bg");
  if (bsBg) {
    host.setAttribute("data-theme-detected", "");
    const bsFg = get("--bs-body-color");
    const bsBorder = get("--bs-border-color");
    const bsSecondary = get("--bs-secondary-color");
    const bsPrimary = get("--bs-primary") || get("--bs-link-color");
    const lines: string[] = [":host {"];
    lines.push(`  --zeon-bg: ${bsBg};`);
    if (bsFg)        lines.push(`  --zeon-text: ${bsFg};`);
    if (bsBorder)    lines.push(`  --zeon-border: ${bsBorder};`);
    if (bsSecondary) lines.push(`  --zeon-muted: ${bsSecondary};`);
    if (bsPrimary)   lines.push(`  --zeon-primary: ${bsPrimary};`);
    lines.push("}");
    return lines.join("\n");
  }

  // Last resort: infer dark/light from computed body background
  const bodyStyle = getComputedStyle(document.body);
  const bodyBg = bodyStyle.backgroundColor;
  const m = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const lum = (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) / 255;
    if (lum < 0.4) {
      // Dark background — override to a neutral dark palette
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

class ZeonWidget {
  private config: WidgetConfig;
  private shadow: ShadowRoot;
  private root: HTMLElement;
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

    // Theme detection: inject overrides if needed
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

  private async loadComments() {
    this.renderLoadingState();
    try {
      this.comments = await fetchComments(
        this.config.appUrl,
        this.config.siteKey,
        this.config.slug,
      );
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
    const header = this.buildHeader();
    this.root.appendChild(header);
    this.root.appendChild(renderLoading());
  }

  private renderErrorState(message: string) {
    this.root.innerHTML = "";
    this.root.appendChild(renderError(message));
  }

  private renderErrorBanner(message: string) {
    const existing = this.root.querySelector(".zeon-error");
    if (existing) existing.remove();
    const banner = renderError(message);
    this.root.insertBefore(banner, this.root.firstChild);
    setTimeout(() => banner.remove(), 4000);
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "zeon-header";
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
        const form = this.shadow.querySelector(".zeon-form");
        form?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }),
    );
  }
}

function mount() {
  const appUrl = __APP_URL__;
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

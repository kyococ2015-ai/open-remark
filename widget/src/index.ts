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

    // Inject scoped styles
    const style = document.createElement("style");
    style.textContent = __STYLES__;
    this.shadow.appendChild(style);

    this.root = document.createElement("div");
    this.root.className = "zeon-root";
    this.shadow.appendChild(this.root);

    this.render();
    this.loadComments();
  }

  private async loadComments() {
    this.renderLoading();
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

  private renderLoading() {
    this.root.innerHTML = "";
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

  private render() {
    this.root.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.className = "zeon-header";
    const heading = document.createElement("h2");
    const count = this.comments.length;
    heading.textContent = `${count} Comment${count !== 1 ? "s" : ""}`;
    header.appendChild(heading);
    this.root.appendChild(header);

    // Auth state error
    if (this.auth.status === "error") {
      this.root.appendChild(renderError(this.auth.message));
    }

    // Auth bar
    this.root.appendChild(
      renderAuthBar(
        this.auth,
        () => this.handleSignIn(),
        () => this.handleSignOut(),
      ),
    );

    // Comment form (only when authenticated)
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

    // Comments list
    this.root.appendChild(
      renderCommentList(this.comments, (comment) => {
        if (this.auth.status !== "authenticated") {
          this.handleSignIn();
          return;
        }
        this.replyTo = comment;
        this.render();
        // Scroll form into view
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

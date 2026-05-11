import type { AuthState, AuthUser } from "./types";
import { exchangeGoogleToken } from "./api";

const STORAGE_KEY = "zeon_widget_token";
const OAUTH_VERIFIER_KEY = "zeon_oauth_verifier";
const OAUTH_STATE_KEY = "zeon_oauth_state";

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64url(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(digest));
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64url(array);
}

function clearOAuthSession() {
  sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
}

export function loadStoredAuth(): AuthState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { status: "idle" };
    const parsed = JSON.parse(raw) as { token: string; user: AuthUser; exp: number };
    if (Date.now() > parsed.exp) {
      sessionStorage.removeItem(STORAGE_KEY);
      return { status: "idle" };
    }
    return { status: "authenticated", token: parsed.token, user: parsed.user };
  } catch {
    return { status: "idle" };
  }
}

export function saveAuth(token: string, user: AuthUser) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, exp }));
}

export function clearAuth() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export async function signInWithGoogle(
  appUrl: string,
  googleClientId: string,
): Promise<{ token: string; user: AuthUser }> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  sessionStorage.setItem(OAUTH_VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?` +
        new URLSearchParams({
          client_id: googleClientId,
          redirect_uri: `${appUrl}/api/widget/oauth-callback`,
          response_type: "code",
          scope: "openid email profile",
          prompt: "select_account",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          state,
        }),
      "zeon-google-signin",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );

    if (!popup) {
      clearOAuthSession();
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    let timer: ReturnType<typeof setInterval>;

    const cleanup = () => {
      clearInterval(timer);
      window.removeEventListener("message", handler);
      clearOAuthSession();
    };

    const handler = async (e: MessageEvent) => {
      if (e.origin !== appUrl) return;
      if (e.data?.type !== "ZEON_GOOGLE_CODE") return;

      const savedState = sessionStorage.getItem(OAUTH_STATE_KEY);
      if (e.data.state !== savedState) {
        cleanup();
        popup.close();
        reject(new Error("Invalid OAuth state — possible CSRF attack"));
        return;
      }

      cleanup();
      popup.close();

      try {
        const code = e.data.code as string;
        const token = await exchangeGoogleToken(appUrl, code, codeVerifier);
        const payload = JSON.parse(atob(token.split(".")[1])) as {
          sub: string;
          name: string;
          image?: string;
          commenterId: string;
        };
        const user: AuthUser = {
          email: payload.sub,
          name: payload.name,
          image: payload.image,
          commenterId: payload.commenterId,
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
        cleanup();
        reject(new Error("Sign-in cancelled"));
      }
    }, 500);
  });
}

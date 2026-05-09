import type { AuthState, AuthUser } from "./types";
import { exchangeGoogleToken } from "./api";

const STORAGE_KEY = "zeon_widget_token";

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
          response_type: "id_token",
          scope: "openid email profile",
          nonce: Math.random().toString(36).slice(2),
          prompt: "select_account",
        }),
      "zeon-google-signin",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );

    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    let timer: ReturnType<typeof setInterval>;

    const handler = async (e: MessageEvent) => {
      if (e.origin !== appUrl) return;
      if (e.data?.type !== "ZEON_GOOGLE_TOKEN") return;
      clearInterval(timer);
      window.removeEventListener("message", handler);
      popup.close();
      try {
        const idToken = e.data.idToken as string;
        const token = await exchangeGoogleToken(appUrl, idToken);
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
        clearInterval(timer);
        window.removeEventListener("message", handler);
        reject(new Error("Sign-in cancelled"));
      }
    }, 500);
  });
}

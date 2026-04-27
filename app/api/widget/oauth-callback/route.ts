import { NextRequest } from "next/server";

// Google OAuth popup lands here with the id_token as a URL fragment (#id_token=...).
// Fragments are client-only, so we serve an HTML page that reads the fragment
// and sends it to the opener via postMessage, then closes itself.
export function GET(_req: NextRequest) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Signing in…</title></head>
<body>
<script>
(function () {
  try {
    var hash = window.location.hash.slice(1);
    var params = new URLSearchParams(hash);
    var idToken = params.get('id_token');
    if (idToken && window.opener) {
      window.opener.postMessage(
        { type: 'ZEON_GOOGLE_TOKEN', idToken: idToken },
        window.location.origin
      );
    }
  } catch (e) {
    console.error('Zeon OAuth callback error', e);
  } finally {
    window.close();
  }
})();
</script>
<p style="font-family:sans-serif;text-align:center;padding:40px;color:#64748b">
  Signing in… this window will close automatically.
</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

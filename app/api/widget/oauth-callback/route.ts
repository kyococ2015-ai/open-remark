import { NextRequest } from "next/server";

// Google OAuth popup lands here with the authorization code as a query param (?code=...).
// We serve an HTML page that reads the code and sends it to the opener via postMessage,
// then closes itself.
export function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Signing in…</title></head>
<body>
<script>
(function () {
  try {
    var code = ${code ? JSON.stringify(code) : "null"};
    if (code && window.opener) {
      // targetOrigin is '*' because window.opener is on the third-party
      // site that embedded the widget, not our origin. The receiving widget
      // validates e.origin === appUrl before acting on the message.
      window.opener.postMessage(
        { type: 'ZEON_GOOGLE_CODE', code: code },
        '*'
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

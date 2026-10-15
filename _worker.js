// Passwortschutz für die Vorab-Version der Seite (Workers + Assets).
// Alles außer /login, /api/login und /admin/ verlangt ein gültiges Session-Cookie.
// Ohne die Secrets SITE_PASSWORD_HASH und SESSION_SECRET bleibt die Seite gesperrt (500).
// Zum Freischalten für die Öffentlichkeit: wrangler.jsonc auf "main" ohne Worker umstellen
// bzw. diese Datei entfernen und neu deployen.

const COOKIE_NAME = "hofladen_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const ALLOWLIST = [/^\/login$/, /^\/api\/login$/, /^\/admin(\/|$)/];
const encoder = new TextEncoder();

function toBase64Url(bytes) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
async function createSessionToken(secret) {
  const issuedAt = Date.now().toString();
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(issuedAt));
  return `${issuedAt}.${toBase64Url(sig)}`;
}
async function verifySessionToken(token, secret) {
  if (!token) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;
  if (Date.now() - Number(issuedAt) > MAX_AGE_SECONDS * 1000) return false;
  const expected = toBase64Url(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(issuedAt)));
  return timingSafeEqual(signature, expected);
}
async function verifyPassword(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  const salt = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
  const km = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, km, 256);
  return timingSafeEqual(btoa(String.fromCharCode(...new Uint8Array(bits))), parts[3]);
}
function getCookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loginPage(next, error) {
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex"><title>Zugang | Bauernhof am Heidengraben</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#2a2a25;color:#e9e2cf;font-family:Georgia,serif;padding:1.6rem}
form{width:100%;max-width:22rem;border:1px solid rgba(233,226,207,.16);background:#3a3a34;padding:2rem 1.8rem}
.l{font-family:"Courier New",monospace;letter-spacing:.1em;text-transform:uppercase;font-size:.78rem;color:#9aa67a}
h1{font-size:1.5rem;margin:.4rem 0 1.2rem}
input{width:100%;box-sizing:border-box;padding:.8rem;margin:0 0 1rem;background:#2a2a25;border:1px solid rgba(233,226,207,.3);color:#e9e2cf;font-size:1rem}
button{width:100%;padding:.85rem;background:#8a5a3a;color:#f6eedb;border:0;font-size:1rem;cursor:pointer;font-family:inherit}
.e{color:#e0a07a;font-family:sans-serif;font-size:.9rem;margin:0 0 1rem}
</style></head><body>
<form method="post" action="/api/login"><span class="l">Vorab-Ansicht</span><h1>Bauernhof am Heidengraben</h1>
${error ? '<p class="e">Passwort stimmt nicht.</p>' : ""}
<input type="hidden" name="next" value="${esc(next)}">
<input type="password" name="password" placeholder="Passwort" autocomplete="current-password" required autofocus>
<button type="submit">Seite öffnen</button></form></body></html>`;
  return new Response(html, { status: error ? 401 : 200, headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
}

async function handleLogin(request, env) {
  const form = await request.formData();
  const password = (form.get("password") || "").toString();
  const next = (form.get("next") || "/").toString();
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (!env.SITE_PASSWORD_HASH || !env.SESSION_SECRET) return new Response("Server nicht konfiguriert.", { status: 500 });
  if (!password || !(await verifyPassword(password, env.SITE_PASSWORD_HASH))) return loginPage(safeNext, true);
  const token = await createSessionToken(env.SESSION_SECRET);
  const headers = new Headers({ Location: safeNext });
  headers.append("Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax; Secure`);
  return new Response(null, { status: 302, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/login" && request.method === "POST") return handleLogin(request, env);
    if (url.pathname === "/login") return loginPage(url.searchParams.get("next") || "/", false);

    if (!ALLOWLIST.some((p) => p.test(url.pathname))) {
      if (!env.SESSION_SECRET) return new Response("Server nicht konfiguriert.", { status: 500 });
      if (!(await verifySessionToken(getCookie(request, COOKIE_NAME), env.SESSION_SECRET))) {
        const loginUrl = new URL("/login", url.origin);
        loginUrl.searchParams.set("next", url.pathname);
        return Response.redirect(loginUrl.toString(), 302);
      }
    }
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    out.headers.set("X-Robots-Tag", "noindex");
    return out;
  },
};

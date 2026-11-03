import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

function matchesSecret(supplied: string, expected: string) {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!db) return new Response("OAuth database unavailable", { status: 503 });
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") ?? "";
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const responseType = url.searchParams.get("response_type") ?? "";
  const challenge = url.searchParams.get("code_challenge") ?? "";
  const challengeMethod = url.searchParams.get("code_challenge_method") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const scope = url.searchParams.get("scope") || "mcp";

  const clients = await db`SELECT client_name, redirect_uris FROM oauth_clients WHERE client_id = ${clientId} LIMIT 1`;
  const client = clients[0] as { client_name: string; redirect_uris: string[] } | undefined;
  if (!client || !client.redirect_uris.includes(redirectUri) || responseType !== "code" || challengeMethod !== "S256" || challenge.length < 43 || !state || scope.split(" ").some((part) => part !== "mcp")) {
    return new Response("Invalid OAuth authorization request", { status: 400 });
  }

  const nonce = randomBytes(24).toString("base64url");
  const hidden = {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    code_challenge: challenge,
    code_challenge_method: challengeMethod,
    state,
    scope,
    nonce,
  };
  const fields = Object.entries(hidden).map(([key, value]) => `<input type="hidden" name="${key}" value="${escapeHtml(value)}">`).join("");
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Autorizar IG Social AI</title><style>body{margin:0;background:#10131b;color:#f5f6fa;font:16px system-ui;display:grid;min-height:100vh;place-items:center}.card{width:min(420px,calc(100% - 40px));background:#191e2b;border:1px solid #34304e;border-radius:18px;padding:28px;box-sizing:border-box}h1{font-size:24px;margin:0 0 10px}p{color:#a7adbc;line-height:1.5;font-size:14px}label{display:block;font-size:12px;color:#c8cadd;margin:22px 0 7px}input{width:100%;box-sizing:border-box;border:1px solid #44415f;background:#0f1320;color:white;border-radius:9px;padding:13px;font-size:14px}button{width:100%;margin-top:18px;border:0;border-radius:9px;padding:13px;background:#9586ff;color:#11121a;font-weight:800;font-size:14px;cursor:pointer}.note{font-size:11px;color:#7f8798;margin-top:14px}</style><body><main class="card"><h1>Conectar Claude con IG Social AI</h1><p><b>${escapeHtml(client.client_name)}</b> solicita permiso para consultar tu cuenta y ejecutar las acciones que apruebes.</p><p>Ingresá la clave privada de administración de IG Social AI. Se usa solo para autorizar esta conexión; Claude recibirá un token OAuth separado.</p><form method="post" action="/oauth/authorize">${fields}<label for="admin_secret">Clave privada</label><input id="admin_secret" name="admin_secret" type="password" autocomplete="current-password" required><button type="submit">Autorizar Claude</button></form><div class="note">Nunca ingreses tu contraseña de Instagram aquí.</div></main></body></html>`;
  const response = new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } });
  const secure = process.env.NODE_ENV === "production";
  return new Response(response.body, {
    status: 200,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      "set-cookie": `mcp_oauth_nonce=${nonce}; HttpOnly; SameSite=Lax; Path=/oauth/authorize; Max-Age=600${secure ? "; Secure" : ""}`,
    },
  });
}

export async function POST(request: Request) {
  if (!db) return new Response("OAuth database unavailable", { status: 503 });
  const form = await request.formData();
  const value = (key: string) => String(form.get(key) ?? "");
  const clientId = value("client_id");
  const redirectUri = value("redirect_uri");
  const challenge = value("code_challenge");
  const challengeMethod = value("code_challenge_method");
  const state = value("state");
  const scope = value("scope") || "mcp";
  const nonce = value("nonce");
  const adminSecret = value("admin_secret");
  const cookie = request.headers.get("cookie")?.match(/(?:^|; )mcp_oauth_nonce=([^;]+)/)?.[1] ?? "";
  const expectedSecret = process.env.MCP_ACCESS_TOKEN ?? "";

  if (!nonce || decodeURIComponent(cookie) !== nonce || !expectedSecret || !matchesSecret(adminSecret, expectedSecret)) {
    return new Response("Clave incorrecta o sesión de autorización vencida. Volvé a conectar desde Claude.", { status: 401 });
  }

  const clients = await db`SELECT redirect_uris FROM oauth_clients WHERE client_id = ${clientId} LIMIT 1`;
  const client = clients[0] as { redirect_uris: string[] } | undefined;
  if (!client || !client.redirect_uris.includes(redirectUri) || challengeMethod !== "S256" || !state) {
    return new Response("Invalid OAuth authorization request", { status: 400 });
  }

  const code = randomBytes(32).toString("base64url");
  const codeHash = createHash("sha256").update(code).digest("hex");
  await db`INSERT INTO oauth_codes (code_hash, client_id, redirect_uri, code_challenge, code_challenge_method, scope, expires_at) VALUES (${codeHash}, ${clientId}, ${redirectUri}, ${challenge}, 'S256', ${scope}, ${new Date(Date.now() + 5 * 60 * 1000).toISOString()})`;

  const destination = new URL(redirectUri);
  destination.searchParams.set("code", code);
  destination.searchParams.set("state", state);
  const response = NextResponse.redirect(destination, 302);
  response.cookies.delete("mcp_oauth_nonce");
  return response;
}

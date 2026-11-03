import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");

function tokenResponse(accessToken: string, refreshToken: string, scope: string) {
  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refreshToken,
    refresh_token_expires_in: 60 * 60 * 24 * 30,
    scope,
  }, { headers: { "cache-control": "no-store", pragma: "no-cache" } });
}

async function issueTokens(clientId: string, scope: string) {
  if (!db) throw new Error("Database unavailable");
  const accessToken = token();
  const refreshToken = token();
  await db`INSERT INTO oauth_tokens (access_token_hash, refresh_token_hash, client_id, scope, expires_at, refresh_expires_at) VALUES (${hash(accessToken)}, ${hash(refreshToken)}, ${clientId}, ${scope}, ${new Date(Date.now() + 60 * 60 * 1000).toISOString()}, ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()})`;
  return tokenResponse(accessToken, refreshToken, scope);
}

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: "server_error" }, { status: 503 });
  const form = await request.formData();
  const value = (key: string) => String(form.get(key) ?? "");
  const grantType = value("grant_type");
  const clientId = value("client_id");

  try {
    if (grantType === "authorization_code") {
      const code = value("code");
      const redirectUri = value("redirect_uri");
      const verifier = value("code_verifier");
      if (!code || !clientId || !redirectUri || !verifier) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

      const rows = await db`SELECT client_id, redirect_uri, code_challenge, code_challenge_method, scope, expires_at, used_at FROM oauth_codes WHERE code_hash = ${hash(code)} LIMIT 1`;
      const authCode = rows[0] as { client_id: string; redirect_uri: string; code_challenge: string; code_challenge_method: string; scope: string; expires_at: string | Date; used_at: string | Date | null } | undefined;
      if (!authCode || authCode.client_id !== clientId || authCode.redirect_uri !== redirectUri || authCode.used_at || new Date(authCode.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
      }
      const computedChallenge = createHash("sha256").update(verifier).digest("base64url");
      if (authCode.code_challenge_method !== "S256" || computedChallenge !== authCode.code_challenge) {
        return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
      }
      const used = await db`UPDATE oauth_codes SET used_at = NOW() WHERE code_hash = ${hash(code)} AND used_at IS NULL RETURNING code_hash`;
      if (!used.length) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
      return await issueTokens(clientId, authCode.scope);
    }

    if (grantType === "refresh_token") {
      const refreshToken = value("refresh_token");
      if (!refreshToken || !clientId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      const rows = await db`SELECT client_id, scope, refresh_expires_at, revoked_at FROM oauth_tokens WHERE refresh_token_hash = ${hash(refreshToken)} LIMIT 1`;
      const current = rows[0] as { client_id: string; scope: string; refresh_expires_at: string | Date; revoked_at: string | Date | null } | undefined;
      if (!current || current.client_id !== clientId || current.revoked_at || new Date(current.refresh_expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
      }
      await db`UPDATE oauth_tokens SET revoked_at = NOW() WHERE refresh_token_hash = ${hash(refreshToken)} AND revoked_at IS NULL`;
      return await issueTokens(clientId, current.scope);
    }

    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret, verifyOAuthState } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectWithError(request: Request, reason: string) {
  const response = NextResponse.redirect(new URL(`/?instagram_error=${encodeURIComponent(reason)}`, request.url));
  response.cookies.delete("ig_oauth_state");
  return response;
}

async function graphGet<T>(path: string, accessToken: string, graphVersion: string): Promise<T> {
  const endpoint = new URL(`https://graph.facebook.com/${graphVersion}/${path}`);
  endpoint.searchParams.set("access_token", accessToken);
  const response = await fetch(endpoint, { cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { error?: { message?: string; code?: number } } & T;
  if (!response.ok) {
    const code = body.error?.code;
    throw new Error(code ? `meta_graph_error_${code}` : "meta_graph_request_failed");
  }
  return body;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = request.headers.get("cookie")?.match(/(?:^|; )ig_oauth_state=([^;]+)/)?.[1];
  const decodedCookie = stateCookie ? decodeURIComponent(stateCookie) : "";

  if (!state || !decodedCookie || state !== decodedCookie || !verifyOAuthState(state)) {
    return redirectWithError(request, "invalid_oauth_state");
  }
  if (url.searchParams.has("error") || !code) {
    return redirectWithError(request, "instagram_authorization_cancelled");
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  const graphVersion = process.env.META_GRAPH_API_VERSION || "v26.0";

  if (!appId || !appSecret || !process.env.META_CONFIG_ID || !redirectUri || !db) {
    return redirectWithError(request, "instagram_integration_not_configured");
  }
  if (!/^v\d+\.\d+$/.test(graphVersion)) {
    return redirectWithError(request, "invalid_meta_api_version");
  }

  try {
    // Unified Login exchanges the authorization code through Graph API.
    const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl, { cache: "no-store" });
    const tokenBody = await tokenResponse.json() as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      error?: { code?: number };
    };
    if (!tokenResponse.ok || !tokenBody.access_token) {
      throw new Error(tokenBody.error?.code ? `meta_token_error_${tokenBody.error.code}` : "meta_token_exchange_failed");
    }

    const accessToken = tokenBody.access_token;
    const business = await graphGet<{ id?: string; client_business_id?: string }>(
      "me?fields=id,client_business_id",
      accessToken,
      graphVersion,
    );
    if (!business.client_business_id) throw new Error("meta_business_portfolio_not_found");

    const assigned = await graphGet<{ data?: Array<{ id?: string; username?: string; account_type?: string }> }>(
      "me/assigned_instagram_accounts?fields=id,username&limit=100",
      accessToken,
      graphVersion,
    );
    const accounts = (assigned.data ?? []).filter((account) => account.id && account.username);
    if (accounts.length === 0) throw new Error("no_instagram_accounts_shared");
    if (accounts.length > 1) throw new Error("multiple_instagram_accounts_shared");

    const profile = accounts[0];
    const instagramUserId = String(profile.id);
    const creatorRows = await db`SELECT id FROM creators ORDER BY created_at ASC LIMIT 1`;
    let creatorId = creatorRows[0]?.id as string | undefined;
    if (!creatorId) {
      const created = await db`INSERT INTO creators (display_name, timezone) VALUES (${profile.username}, 'America/Montevideo') RETURNING id`;
      creatorId = created[0]?.id as string | undefined;
    }
    if (!creatorId) throw new Error("creator_record_failed");

    const encryptedToken = encryptSecret(accessToken);
    const expiresAt = tokenBody.expires_in
      ? new Date(Date.now() + tokenBody.expires_in * 1000).toISOString()
      : null;
    const scopes = [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_comments",
      "instagram_manage_messages",
      "instagram_manage_insights",
    ];

    await db`INSERT INTO instagram_accounts (creator_id, instagram_user_id, username, account_type, access_token_encrypted, token_expires_at, scopes) VALUES (${creatorId}, ${instagramUserId}, ${profile.username}, ${profile.account_type ?? null}, ${encryptedToken}, ${expiresAt}, ${scopes}) ON CONFLICT (instagram_user_id) DO UPDATE SET creator_id = EXCLUDED.creator_id, username = EXCLUDED.username, account_type = EXCLUDED.account_type, access_token_encrypted = EXCLUDED.access_token_encrypted, token_expires_at = EXCLUDED.token_expires_at, scopes = EXCLUDED.scopes, updated_at = NOW()`;

    await db`INSERT INTO audit_log (creator_id, actor, action, target_type, target_id, details) VALUES (${creatorId}, 'system', 'instagram_account_connected', 'instagram_account', ${instagramUserId}, ${JSON.stringify({ username: profile.username, auth_method: "unified_login", client_business_id: business.client_business_id })}::jsonb)`;

    const response = NextResponse.redirect(new URL("/?instagram=connected", request.url));
    response.cookies.delete("ig_oauth_state");
    return response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "instagram_connection_failed";
    return redirectWithError(request, reason.startsWith("meta_") || reason.endsWith("_shared") ? reason : "instagram_connection_failed");
  }
}

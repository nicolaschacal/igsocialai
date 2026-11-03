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
  const graphVersion = process.env.META_GRAPH_API_VERSION || "v25.0";

  if (!appId || !appSecret || !redirectUri || !db) {
    return redirectWithError(request, "instagram_integration_not_configured");
  }
  if (!/^v\d+\.\d+$/.test(graphVersion)) {
    return redirectWithError(request, "invalid_meta_api_version");
  }

  try {
    const shortTokenBody = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const shortTokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: shortTokenBody,
      cache: "no-store",
    });
    if (!shortTokenResponse.ok) throw new Error("short_token_exchange_failed");
    const shortToken = await shortTokenResponse.json() as { access_token?: string; user_id?: string | number };
    if (!shortToken.access_token) throw new Error("missing_short_token");

    const longTokenUrl = new URL("https://graph.instagram.com/access_token");
    longTokenUrl.searchParams.set("grant_type", "ig_exchange_token");
    longTokenUrl.searchParams.set("client_secret", appSecret);
    longTokenUrl.searchParams.set("access_token", shortToken.access_token);

    const longTokenResponse = await fetch(longTokenUrl, { cache: "no-store" });
    if (!longTokenResponse.ok) throw new Error("long_token_exchange_failed");
    const longToken = await longTokenResponse.json() as { access_token?: string; token_type?: string; expires_in?: number };
    if (!longToken.access_token) throw new Error("missing_long_token");

    const profileUrl = new URL(`https://graph.instagram.com/${graphVersion}/me`);
    profileUrl.searchParams.set("fields", "user_id,username,account_type");
    profileUrl.searchParams.set("access_token", longToken.access_token);

    const profileResponse = await fetch(profileUrl, { cache: "no-store" });
    if (!profileResponse.ok) throw new Error("instagram_profile_fetch_failed");
    const profile = await profileResponse.json() as { user_id?: string | number; id?: string | number; username?: string; account_type?: string };
    const instagramUserId = String(profile.user_id ?? profile.id ?? shortToken.user_id ?? "");
    if (!instagramUserId || !profile.username) throw new Error("instagram_profile_incomplete");

    const creatorRows = await db`SELECT id FROM creators ORDER BY created_at ASC LIMIT 1`;
    let creatorId = creatorRows[0]?.id as string | undefined;
    if (!creatorId) {
      const created = await db`INSERT INTO creators (display_name, timezone) VALUES (${profile.username}, 'America/Montevideo') RETURNING id`;
      creatorId = created[0]?.id as string | undefined;
    }
    if (!creatorId) throw new Error("creator_record_failed");

    const encryptedToken = encryptSecret(longToken.access_token);
    const expiresAt = new Date(Date.now() + Number(longToken.expires_in ?? 5_184_000) * 1000);
    const scopes = [
      "instagram_business_basic",
      "instagram_business_content_publish",
      "instagram_business_manage_comments",
      "instagram_business_manage_messages",
      "instagram_business_manage_insights",
    ];

    await db`INSERT INTO instagram_accounts (creator_id, instagram_user_id, username, account_type, access_token_encrypted, token_expires_at, scopes) VALUES (${creatorId}, ${instagramUserId}, ${profile.username}, ${profile.account_type ?? null}, ${encryptedToken}, ${expiresAt.toISOString()}, ${scopes}) ON CONFLICT (instagram_user_id) DO UPDATE SET creator_id = EXCLUDED.creator_id, username = EXCLUDED.username, account_type = EXCLUDED.account_type, access_token_encrypted = EXCLUDED.access_token_encrypted, token_expires_at = EXCLUDED.token_expires_at, scopes = EXCLUDED.scopes, updated_at = NOW()`;

    await db`INSERT INTO audit_log (creator_id, actor, action, target_type, target_id, details) VALUES (${creatorId}, 'system', 'instagram_account_connected', 'instagram_account', ${instagramUserId}, ${JSON.stringify({ username: profile.username, account_type: profile.account_type ?? null })}::jsonb)`;

    const response = NextResponse.redirect(new URL("/?instagram=connected", request.url));
    response.cookies.delete("ig_oauth_state");
    return response;
  } catch {
    return redirectWithError(request, "instagram_connection_failed");
  }
}

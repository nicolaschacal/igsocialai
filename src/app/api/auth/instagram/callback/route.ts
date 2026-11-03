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
  const configId = process.env.META_CONFIG_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  const graphVersion = process.env.META_GRAPH_API_VERSION || "v26.0";

  if (!appId || !appSecret || !configId || !redirectUri || !db) {
    return redirectWithError(request, "instagram_integration_not_configured");
  }
  if (!/^v\\d+\\.\\d+$/.test(graphVersion)) {
    return redirectWithError(request, "invalid_meta_api_version");
  }

  try {
    // Unified Login uses Facebook Login for Business and the configuration ID.
    // The selected configuration determines the permissions and SUAT token type.
    const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl, { cache: "no-store" });
    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      error?: { message?: string; type?: string; code?: number };
    };
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(`unified_token_exchange_failed:${tokenData.error?.code ?? tokenResponse.status}`);
    }

    const accessToken = tokenData.access_token;
    const graphBase = `https://graph.facebook.com/${graphVersion}`;
    const assignedUrl = new URL(`${graphBase}/me/assigned_instagram_accounts`);
    assignedUrl.searchParams.set("fields", "id,username,account_type");
    assignedUrl.searchParams.set("access_token", accessToken);

    const assignedResponse = await fetch(assignedUrl, { cache: "no-store" });
    const assignedData = await assignedResponse.json() as {
      data?: Array<{ id?: string | number; username?: string; account_type?: string }>;
      error?: { message?: string; code?: number };
    };
    if (!assignedResponse.ok) {
      throw new Error(`assigned_instagram_accounts_failed:${assignedData.error?.code ?? assignedResponse.status}`);
    }
    const instagramAccount = assignedData.data?.find((account) => account.id && account.username);
    if (!instagramAccount?.id || !instagramAccount.username) {
      throw new Error("no_assigned_instagram_account");
    }

    // Read the selected professional account directly; /me refers to the token
    // principal in Unified Login and is not guaranteed to be the Instagram account.
    const profileUrl = new URL(`${graphBase}/${instagramAccount.id}`);
    profileUrl.searchParams.set("fields", "id,username,account_type");
    profileUrl.searchParams.set("access_token", accessToken);
    const profileResponse = await fetch(profileUrl, { cache: "no-store" });
    const profile = await profileResponse.json() as {
      id?: string | number;
      username?: string;
      account_type?: string;
      error?: { message?: string; code?: number };
    };
    if (!profileResponse.ok || !profile.id || !profile.username) {
      throw new Error(`instagram_profile_fetch_failed:${profile.error?.code ?? profileResponse.status}`);
    }

    const creatorRows = await db`SELECT id FROM creators ORDER BY created_at ASC LIMIT 1`;
    let creatorId = creatorRows[0]?.id as string | undefined;
    if (!creatorId) {
      const created = await db`INSERT INTO creators (display_name, timezone) VALUES (${profile.username}, 'America/Montevideo') RETURNING id`;
      creatorId = created[0]?.id as string | undefined;
    }
    if (!creatorId) throw new Error("creator_record_failed");

    const encryptedToken = encryptSecret(accessToken);
    const expiresIn = Number(tokenData.expires_in ?? 0);
    const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000)
      : null;
    const scopes = [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_comments",
      "instagram_manage_messages",
      "instagram_manage_insights",
    ];

    await db`INSERT INTO instagram_accounts (creator_id, instagram_user_id, username, account_type, access_token_encrypted, token_expires_at, scopes)
      VALUES (${creatorId}, ${String(profile.id)}, ${profile.username}, ${profile.account_type ?? null}, ${encryptedToken}, ${expiresAt?.toISOString() ?? null}, ${scopes})
      ON CONFLICT (instagram_user_id) DO UPDATE SET creator_id = EXCLUDED.creator_id, username = EXCLUDED.username,
      account_type = EXCLUDED.account_type, access_token_encrypted = EXCLUDED.access_token_encrypted,
      token_expires_at = EXCLUDED.token_expires_at, scopes = EXCLUDED.scopes, updated_at = NOW()`;

    await db`INSERT INTO audit_log (creator_id, actor, action, target_type, target_id, details)
      VALUES (${creatorId}, 'system', 'instagram_account_connected', 'instagram_account', ${String(profile.id)},
      ${JSON.stringify({ username: profile.username, account_type: profile.account_type ?? null, tokenType: tokenData.token_type ?? "bearer", configId })}::jsonb)`;

    const response = NextResponse.redirect(new URL("/?instagram=connected", request.url));
    response.cookies.delete("ig_oauth_state");
    return response;
  } catch (error) {
    // Keep provider details out of the browser URL; the reason code is safe to display.
    const message = error instanceof Error ? error.message : "";
    const reason = message.startsWith("no_assigned_instagram_account")
      ? "no_instagram_account_assigned_to_business"
      : message.startsWith("assigned_instagram_accounts_failed")
        ? "could_not_list_assigned_instagram_accounts"
        : message.startsWith("unified_token_exchange_failed")
          ? "unified_login_token_exchange_failed"
          : "instagram_connection_failed";
    return redirectWithError(request, reason);
  }
}

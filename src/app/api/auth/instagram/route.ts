import { NextResponse } from "next/server";
import { randomOAuthState } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!appId || !redirectUri || !encryptionKey) {
    return NextResponse.json(
      { error: "Instagram login is not configured. Add META_APP_ID, META_REDIRECT_URI and APP_ENCRYPTION_KEY." },
      { status: 503 },
    );
  }

  let state: string;
  try {
    state = randomOAuthState();
  } catch {
    return NextResponse.json({ error: "OAuth state signing is not configured correctly." }, { status: 503 });
  }

  const scopes = [
    "instagram_business_basic",
    "instagram_business_content_publish",
    "instagram_business_manage_comments",
    "instagram_business_manage_messages",
    "instagram_business_manage_insights",
  ];

  const authorizeUrl = new URL("https://www.instagram.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", scopes.join(","));
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}

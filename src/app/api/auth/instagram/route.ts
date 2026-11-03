import { NextResponse } from "next/server";
import { randomOAuthState } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const appId = process.env.META_APP_ID;
  const configId = process.env.META_CONFIG_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!appId || !configId || !redirectUri || !encryptionKey) {
    return NextResponse.json(
      { error: "Unified Instagram login is not configured. Add META_APP_ID, META_CONFIG_ID, META_REDIRECT_URI and APP_ENCRYPTION_KEY." },
      { status: 503 },
    );
  }

  let state: string;
  try {
    state = randomOAuthState();
  } catch {
    return NextResponse.json({ error: "OAuth state signing is not configured correctly." }, { status: 503 });
  }

  const authorizeUrl = new URL("https://www.facebook.com/dialog/oauth");
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("config_id", configId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("override_default_response_type", "true");
  authorizeUrl.searchParams.set("prompt", "login");
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

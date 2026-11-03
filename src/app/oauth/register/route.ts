import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: "server_error", error_description: "OAuth database is not configured." }, { status: 503 });
  try {
    const body = await request.json() as {
      client_name?: string;
      redirect_uris?: string[];
      grant_types?: string[];
      response_types?: string[];
      token_endpoint_auth_method?: string;
    };
    const clientName = String(body.client_name || "Claude MCP Client").slice(0, 120);
    const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((uri) => typeof uri === "string" && uri.length <= 2048) : [];
    if (!redirectUris.length || redirectUris.length > 10) {
      return NextResponse.json({ error: "invalid_client_metadata", error_description: "One or more redirect_uris are required." }, { status: 400 });
    }
    const validUris = redirectUris.every((uri) => {
      try {
        const parsed = new URL(uri);
        return parsed.protocol === "https:" || parsed.protocol === "claude:";
      } catch { return false; }
    });
    if (!validUris) return NextResponse.json({ error: "invalid_redirect_uri", error_description: "Redirect URIs must use HTTPS or the Claude callback scheme." }, { status: 400; });

    const grantTypes = body.grant_types ?? ["authorization_code", "refresh_token"];
    const responseTypes = body.response_types ?? ["code"];
    if (!grantTypes.includes("authorization_code") || !responseTypes.includes("code")) {
      return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
    }
    if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== "none") {
      return NextResponse.json({ error: "invalid_client_metadata", error_description: "Only public clients using token_endpoint_auth_method=none are supported." }, { status: 400 });
    }

    const clientId = randomBytes(24).toString("hex");
    await db`INSERT INTO oauth_clients (client_id, client_name, redirect_uris, grant_types, response_types, token_endpoint_auth_method) VALUES (${clientId}, ${clientName}, ${redirectUris}, ${grantTypes}, ${responseTypes}, 'none')`;
    return NextResponse.json({
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: responseTypes,
      token_endpoint_auth_method: "none",
    }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }
}

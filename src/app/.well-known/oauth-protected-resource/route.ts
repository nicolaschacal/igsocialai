import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://igsocialai.vercel.app").replace(/\/$/, "");
  return NextResponse.json({
    resource: `${baseUrl}/api/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: ["mcp"],
    bearer_methods_supported: ["header"],
    resource_documentation: baseUrl,
  }, { headers: { "cache-control": "public, max-age=300" } });
}

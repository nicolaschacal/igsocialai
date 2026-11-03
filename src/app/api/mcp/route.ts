import { mcpHandler } from "@/lib/mcp-server";
import { isAuthorizedMcpRequest } from "@/lib/mcp-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://igsocialai.vercel.app";
  const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
  if (!(await isAuthorizedMcpRequest(request))) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "Provide a valid Bearer token." }),
      {
        status: 401,
        headers: {
          "content-type": "application/json",
          "www-authenticate": `Bearer realm="ig-social-ai", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="mcp"`,
        },
      },
    );
  }

  return mcpHandler.fetch(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

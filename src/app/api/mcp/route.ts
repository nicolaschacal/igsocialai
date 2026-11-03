import { mcpHandler } from "@/lib/mcp-server";
import { isAuthorizedMcpRequest } from "@/lib/mcp-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!isAuthorizedMcpRequest(request)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "Provide a valid Bearer token." }),
      {
        status: 401,
        headers: {
          "content-type": "application/json",
          "www-authenticate": 'Bearer realm="ig-social-ai"',
        },
      },
    );
  }

  return mcpHandler.fetch(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

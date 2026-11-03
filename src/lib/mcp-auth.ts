import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

export async function isAuthorizedMcpRequest(request: Request): Promise<boolean> {
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!supplied) return false;

  // The master secret is reserved for the owner's local render worker and OAuth consent screen.
  const masterSecret = process.env.MCP_ACCESS_TOKEN;
  if (masterSecret) {
    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(masterSecret);
    if (suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer)) {
      return true;
    }
  }

  // Claude receives a separate short-lived OAuth access token.
  if (!db) return false;
  try {
    const tokenHash = createHash("sha256").update(supplied).digest("hex");
    const rows = await db`SELECT access_token_hash FROM oauth_tokens WHERE access_token_hash = ${tokenHash} AND expires_at > NOW() AND revoked_at IS NULL LIMIT 1`;
    return rows.length > 0;
  } catch {
    return false;
  }
}

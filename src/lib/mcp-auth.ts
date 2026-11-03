import { timingSafeEqual } from "node:crypto";

export function isAuthorizedMcpRequest(request: Request): boolean {
  const expected = process.env.MCP_ACCESS_TOKEN;
  if (!expected) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!supplied) return false;

  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(suppliedBuffer, expectedBuffer);
}

# Integration status and constraints

## Claude / MCP
The app exposes a remote Streamable HTTP MCP endpoint at `/api/mcp`. The initial endpoint uses a single bearer token from `MCP_ACCESS_TOKEN` for private development. This is not multi-user OAuth and must be replaced with per-user OAuth before selling the service.

## Instagram
Use only Meta's official Instagram APIs for professional Creator/Business accounts. Personal consumer accounts are not supported by the relevant publishing/management APIs. Permissions and app review/advanced access are required for production customers.

Instagram comment private replies and messaging are subject to Meta's eligibility, permission, and time-window rules. The product must not promise arbitrary cold DMs. Follow verification is not assumed to be available; verify the exact endpoint/permission before implementing a "must follow" gate.

## ElevenLabs
The voice provider is optional and is configured using a server-side API key and voice ID. The free tier has a finite monthly credit allowance and terms/usage restrictions; do not claim unlimited free generation.

## Cost strategy
- Claude subscription is used in the Claude app for interactive reasoning.
- Do not attempt to reuse Claude's consumer subscription as a server-side API key.
- Render locally during development with FFmpeg/Remotion.
- Use free database/storage quotas initially and enforce usage limits.
- A genuinely unattended daily AI workflow needs a server-side model/provider or a human-triggered Claude session.

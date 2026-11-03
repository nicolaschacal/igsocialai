# Integration status and constraints

## Claude / MCP
The app exposes a remote Streamable HTTP MCP endpoint at `/api/mcp`. The initial endpoint uses a single bearer token from `MCP_ACCESS_TOKEN` for private development. This is not multi-user OAuth and must be replaced with per-user OAuth before selling the service.

## Instagram
The first integration path is **Instagram Login / Business Login**, intended for professional Creator and Business accounts without requiring a linked Facebook Page. OAuth starts at `/api/auth/instagram` and returns to `/api/auth/instagram/callback`.

Requested permissions:
- `instagram_business_basic`
- `instagram_business_content_publish`
- `instagram_business_manage_comments`
- `instagram_business_manage_messages`
- `instagram_business_manage_insights`

Meta app credentials must come from the Instagram API / Business Login setup. Add the exact redirect URI from `META_REDIRECT_URI` to the Meta app configuration. During initial tests, the account must be allowed by the app's development/tester configuration. Production customers require the relevant App Review / Advanced Access.

The OAuth implementation exchanges the authorization code for a short-lived token, exchanges that for a long-lived token, encrypts it using AES-256-GCM, and stores it in Neon. Token refresh, account insights, publishing, comments, messaging, and webhooks remain separate implementation milestones.

Private replies, DMs and messaging are subject to Meta permissions, recipient interaction requirements and messaging windows. Do not promise arbitrary cold DMs. Follow verification is not assumed to be available; verify the exact endpoint/permission before implementing a "must follow" gate.

## ElevenLabs
The voice provider is optional and is configured using a server-side API key and voice ID. The free tier has a finite monthly credit allowance and terms/usage restrictions; do not claim unlimited free generation.

## Cost strategy
- Claude subscription is used in the Claude app for interactive reasoning.
- Do not attempt to reuse Claude's consumer subscription as a server-side model API key.
- Render locally during development with FFmpeg/Remotion.
- Use free database/storage quotas initially and enforce usage limits.
- A genuinely unattended daily AI workflow needs a server-side model/provider or a human-triggered Claude session.

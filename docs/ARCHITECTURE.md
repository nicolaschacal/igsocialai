# Architecture

## Components
- **Web app:** Next.js dashboard for account status, content previews, review queue, calendar, automation policies, and audit log.
- **Meta adapter:** OAuth, token refresh/health, Instagram Graph API, publishing, comment moderation/replies, messaging, and webhook verification.
- **MCP server:** Remote authenticated MCP endpoint. Exposes read-only tools, draft tools, approval tools, and separately permissioned execution tools.
- **Orchestrator:** Durable jobs for daily planning, voice generation, video rendering, scheduling, webhook processing, retries, and notifications.
- **Media pipeline:** Script -> scene manifest -> voiceover -> Remotion composition -> FFmpeg encode -> object storage -> review preview.
- **Database:** Users, connected accounts, encrypted tokens, creator profiles, analytics snapshots, content versions, assets, approvals, schedules, automation rules, conversations, webhook events, and audit events.

## Key rule: Claude is the control plane, not the worker
Claude connects to our remote MCP server and can call its tools while the user is in Claude. Claude's consumer subscription is not an API credential that our backend can use for unattended nightly generation. Background jobs must either:
1. perform deterministic work (scheduling, webhook processing, rendering from approved manifests), or
2. use a separately configured model API/provider, or
3. wait for the user to open Claude and request/approve the next generation step.

Do not promise fully autonomous daily AI generation using only a Claude subscription.

## Suggested data model
- users
- instagram_accounts
- encrypted_credentials
- creator_profiles
- niche_audits
- content_ideas
- content_projects
- content_versions
- media_assets
- voice_profiles
- approvals
- scheduled_posts
- automation_rules
- webhook_events
- conversations
- conversation_messages
- action_logs

Every external action stores account_id, actor, policy/approval reference, provider request id, idempotency key, status, and timestamps.

## Security
- Never collect Instagram passwords.
- Encrypt Meta and ElevenLabs tokens at rest using a server-side key.
- Verify Meta webhook signatures and challenge tokens.
- Validate OAuth state and redirect URIs.
- Scope MCP access to the authenticated user's connected accounts.
- Enforce approval and policy checks on the server, not only in Claude instructions or UI.
- Make webhook handlers idempotent.
- Keep an append-only audit trail for publishing and messaging.
- Do not send unsolicited bulk messages. Respect Meta's supported messaging windows and permissions.

## Deployment note
Vercel is suitable for the Next.js UI and short API/webhook handlers. Long video renders and durable queues may require a separate worker or local render runner. Avoid assuming a serverless function can run FFmpeg/Remotion jobs for arbitrary durations.

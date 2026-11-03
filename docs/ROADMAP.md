# Roadmap

## M0 — Foundation
- [x] Initialize Next.js app shell
- [x] Create first dashboard UI
- [x] Document product and architecture boundaries
- [ ] Install dependencies and run a production build
- [ ] Connect repository to Vercel

## M1 — Instagram connection
- [ ] Create Meta developer app
- [x] Scaffold Instagram professional account OAuth (requires Meta credentials and live tester authorization)
- [x] Implement signed state-protected OAuth callback
- [x] Store encrypted long-lived tokens in Neon
- [ ] Read account profile and recent media
- [ ] Add token health and disconnect flow

## M2 — Claude MCP
- [ ] Implement authenticated remote MCP endpoint
- [ ] Add tools: get_account, get_media, get_insights, audit_profile, propose_ideas
- [ ] Add draft tools: create_script, create_storyboard, create_caption, create_cover_brief
- [x] Add draft update and version-bound creator approval request/decision tools
- [x] Add approved Reel container creation and idempotent publish-finalize tools with content-hash validation
- [ ] Add execution tools: publish_approved_content, schedule_approved_content
- [ ] Enforce server-side approval checks

## M3 — Media production
- [x] Define a versioned scene-manifest shape for the first Remotion template
- [x] Build first local 9:16 Remotion motion-graphics template
- [x] Add ElevenLabs voice provider adapter and private Neon audio asset storage
- [x] Add local Remotion render runner and protected audio download route
- [ ] Generate cover image and caption package

## M4 — Community automation
- [ ] Subscribe to approved Meta webhooks
- [ ] Keyword comment rules
- [ ] Private reply flow where Meta permits
- [ ] Inbox ingestion and response queue
- [ ] FAQ policies, human handoff, and audit log

## M5 — Daily operations
- [ ] Durable retry queue for webhooks, Meta operations and media jobs (Claude Cowork handles the daily AI schedule)
- [x] Morning performance briefing delegated to Claude Cowork scheduled tasks
- [x] Daily briefing and three content proposals delegated to Claude Cowork scheduled tasks
- [ ] Approved publishing calendar
- [ ] Usage limits and cost controls

## M6 — SaaS readiness
- [ ] Multi-tenant isolation
- [ ] Meta App Review / Advanced Access
- [ ] Consent, privacy policy, data deletion flow
- [ ] Billing and plan quotas
- [ ] Abuse prevention and operational monitoring

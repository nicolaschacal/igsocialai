# Roadmap

## M0 — Foundation
- [x] Initialize Next.js app shell
- [x] Create first dashboard UI
- [x] Document product and architecture boundaries
- [ ] Install dependencies and run a production build
- [ ] Connect repository to Vercel

## M1 — Instagram connection
- [ ] Create Meta developer app
- [ ] Configure Instagram professional account OAuth
- [ ] Implement state-protected OAuth callback
- [ ] Store encrypted tokens
- [ ] Read account profile and recent media
- [ ] Add token health and disconnect flow

## M2 — Claude MCP
- [ ] Implement authenticated remote MCP endpoint
- [ ] Add tools: get_account, get_media, get_insights, audit_profile, propose_ideas
- [ ] Add draft tools: create_script, create_storyboard, create_caption, create_cover_brief
- [ ] Add review tools: list_approvals, approve_content, request_revision
- [ ] Add execution tools: publish_approved_content, schedule_approved_content
- [ ] Enforce server-side approval checks

## M3 — Media production
- [ ] Define versioned scene-manifest JSON
- [ ] Build reusable Remotion templates
- [ ] Add ElevenLabs voice provider adapter
- [ ] Render preview and store media assets
- [ ] Generate cover image and caption package

## M4 — Community automation
- [ ] Subscribe to approved Meta webhooks
- [ ] Keyword comment rules
- [ ] Private reply flow where Meta permits
- [ ] Inbox ingestion and response queue
- [ ] FAQ policies, human handoff, and audit log

## M5 — Daily operations
- [ ] Durable scheduler and retry queue
- [ ] Morning performance report
- [ ] Daily content proposal job
- [ ] Approved publishing calendar
- [ ] Usage limits and cost controls

## M6 — SaaS readiness
- [ ] Multi-tenant isolation
- [ ] Meta App Review / Advanced Access
- [ ] Consent, privacy policy, data deletion flow
- [ ] Billing and plan quotas
- [ ] Abuse prevention and operational monitoring

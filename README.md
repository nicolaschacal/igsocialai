# IG Social AI

AI-assisted Instagram content and community operations, controlled from Claude through MCP.

## Product principle
Claude is the approval and planning interface. The application server performs scheduled work independently, but publishing, outbound DMs, and automated replies are gated by explicit user policies and Meta permissions.

## Current milestone
Foundation scaffold: product dashboard, architecture notes, and safe integration boundaries. Instagram, ElevenLabs, Claude MCP, and publishing are not connected yet.

## Planned architecture
- Next.js dashboard and API routes
- PostgreSQL (Neon) for users, connected accounts, content, automation rules, approvals, and audit logs
- Meta Instagram Graph API + Webhooks (professional accounts and approved permissions only)
- MCP server exposing read, draft, approval, and publishing tools
- Remotion/FFmpeg for template-driven motion graphics
- ElevenLabs for voice generation (requires a paid/free-tier API account and usage quota)
- Durable scheduler/worker for daily plans, render jobs, and approved publishing

## Local development
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment
See [.env.example](.env.example). Never commit real tokens or API keys.

## Non-goals for the first milestone
- No scraping or Instagram password collection
- No unsolicited bulk DMs
- No publishing without an explicit approval record
- No promise of zero operating cost: Claude subscription does not cover Meta hosting, media rendering, ElevenLabs, database, or storage.

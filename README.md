# IG Social AI

**Your Instagram creator agent, operated from Claude.**

The primary product experience is Claude Cowork: a 07:00 scheduled briefing, three content concepts, creator-approved production, and community operations. Cowork's scheduled task is the initial daily orchestrator; the app exposes remote MCP tools. The web app is a small connection and settings surface — not a traditional social-media dashboard.

## Current foundation

- Next.js app shell and setup page
- Remote MCP endpoint: `/api/mcp` (Streamable HTTP)
- Initial MCP tools for workspace status, saving/listing/selecting content ideas, and listing approvals
- Neon Postgres schema for creator settings, Instagram accounts, content ideas, assets, approvals, automation rules, reports, webhooks, and audit logs
- Product, daily workflow, integration constraints, and roadmap documentation

**This is a foundation, not yet a connected Instagram automation product.** Instagram OAuth, real insights, media rendering, publishing, messaging, and scheduler are still to be implemented.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Required configuration

- `DATABASE_URL`: Neon Postgres connection string
- `MCP_ACCESS_TOKEN`: long random secret used to protect the private development MCP endpoint
- `APP_ENCRYPTION_KEY`: 32-byte key encoded as 64 hexadecimal characters; encrypt provider credentials before storing them
- `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`: Meta developer app credentials (not yet wired)
- `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`: voice generation (not yet wired)

Apply `database/migrations/0001_initial.sql` to the Neon database before using database-backed MCP tools.

## Claude connection

Once deployed, configure a remote MCP connector in Claude using:

```
https://YOUR-APP-DOMAIN/api/mcp
```

The current development endpoint expects an Authorization Bearer token matching `MCP_ACCESS_TOKEN`. This single-token approach is only for private development. Before offering the product to customers, replace it with per-user OAuth, tenant isolation, and account-level authorization.

## Non-negotiable safety boundaries

- Never collect Instagram passwords or scrape private account data.
- Use official Meta APIs and obtain required permissions/app review.
- Never publish without approval for the exact content version.
- Never send unsolicited bulk DMs.
- Respect Meta messaging windows, private-reply rules, and rate limits.
- Never claim to verify a follow unless an officially supported API capability confirms it.
- Keep an audit trail for every publish, reply, and DM.

## Cost reality

Claude's consumer subscription is used interactively in Claude. It is not a server-side API credential for unattended AI runs. Free tiers can support an early prototype, but ElevenLabs, hosting, database/storage quotas, and unattended model calls have separate limits and may incur costs.

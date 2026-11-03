# IG Social AI

**Your Instagram creator agent, operated from Claude Cowork.**

The primary product experience is Claude Cowork: a 07:00 scheduled briefing, three content concepts, creator-approved production, and community operations. Cowork's scheduled task is the initial daily orchestrator; the app exposes remote MCP tools. The web app is a small connection and settings surface — not a traditional social-media dashboard.

## Current foundation

- Next.js setup portal
- Remote MCP endpoint: `/api/mcp` (Streamable HTTP, private Bearer token for development)
- MCP tools for workspace status, Instagram profile/recent-media data, saving/listing/selecting content ideas, approvals, and ElevenLabs voice generation
- Instagram Login OAuth scaffold with signed state and AES-256-GCM encrypted long-lived token storage
- Neon Postgres schema for creator settings, Instagram accounts, content ideas, assets, approvals, automation rules, reports, webhooks, audit logs, and audio payloads
- Local Remotion 9:16 motion-graphics template and protected voiceover download / render runner
- Claude Cowork daily schedule prompt in `docs/CLAUDE-SCHEDULE-PROMPT.md`

**This is a foundation, not yet a fully connected Instagram automation product.** Live Meta login, insights, publishing, comment/DM webhooks and automation, content approval execution, and the final end-to-end render flow still need credentials, permissions, implementation, and testing.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Required environment variables

Set these in Vercel → Project → Settings → Environment Variables, and in `.env.local` for local rendering:

- `DATABASE_URL`: pooled Neon Postgres connection string for the `igsocialai` project.
- `MCP_ACCESS_TOKEN`: long random secret used to protect the private MCP endpoint.
- `APP_ENCRYPTION_KEY`: 32 random bytes encoded as 64 hexadecimal characters. Used for OAuth state signing and AES-256-GCM encryption.
- `META_APP_ID`: Instagram App ID from Instagram → API setup with Instagram Login (not the generic Meta App ID shown in App Settings → Basic).
- `META_APP_SECRET`: matching Instagram App Secret.
- `META_REDIRECT_URI`: exactly `https://igsocialai.vercel.app/api/auth/instagram/callback`.
- `META_GRAPH_API_VERSION`: `v26.0`.
- `META_VERIFY_TOKEN`: random webhook verification token; also enter the same value in Meta's webhook configuration.
- `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`: required for voice generation.
- `NEXT_PUBLIC_APP_URL`: `https://igsocialai.vercel.app`.
- `IGSOCIALAI_URL`: same URL, used by the local renderer.

Generate the two random secrets on a computer with Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it twice: one output for `MCP_ACCESS_TOKEN`, one for `APP_ENCRYPTION_KEY`. Do not commit either value.

Apply `database/migrations/0001_initial.sql` to the Neon database before using database-backed MCP tools. The initial schema and media-asset table have already been created in the dedicated Neon project.

## Connect Claude

Add a custom remote MCP connector in Claude:

- Name: `IG Social AI`
- Server URL: `https://igsocialai.vercel.app/api/mcp`
- Authentication: request header `Authorization: Bearer YOUR_MCP_ACCESS_TOKEN`

Claude supports fixed request headers for remote MCP servers. After connecting, enable the connector in Cowork and create the daily scheduled task using `docs/CLAUDE-SCHEDULE-PROMPT.md`.

## Connect Instagram

Create a Meta app with the Instagram Business Login use case. Add this exact callback URI:

```
https://igsocialai.vercel.app/api/auth/instagram/callback
```

For initial testing, add your own Instagram professional account as an app tester and accept the invitation. Production customers require the relevant Meta App Review / Advanced Access.

## Render a Reel locally

```powershell
npm install
npm run worker:render
```

Keep the worker running (or start it at Windows login with Task Scheduler). Claude queues render jobs through MCP; the local worker renders `out/reel.mp4` and `out/cover.jpg` from the saved storyboard, then uploads both to Neon. See `docs/VIDEO-RENDERING.md` and `docs/ELEVENLABS.md`.

## Safety boundaries

- Never collect Instagram passwords or scrape private account data.
- Use official Meta APIs and obtain required permissions/app review.
- Never publish without approval for the exact content version.
- Never send unsolicited bulk DMs.
- Respect Meta messaging windows, private-reply rules, and rate limits.
- Never claim to verify a follow unless an officially supported API capability confirms it.
- Keep an audit trail for every publish, reply, and DM.

## Cost reality

Claude Cowork scheduled tasks can run the daily AI briefing remotely using the user's paid Claude plan and connected MCP tools. That avoids a separate Claude API bill for the initial workflow, but uses Claude plan limits. Neon and Vercel free tiers may be sufficient for an early single-user prototype. ElevenLabs has finite free credits; video rendering is local. Free quotas and provider terms can change.

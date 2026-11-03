import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { db, databaseUnavailableMessage } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export const mcpHandler = createMcpHandler(() => {
  const server = new McpServer({
    name: "ig-social-ai",
    version: "0.2.0",
  });

  server.registerTool(
    "instagram_workspace_status",
    {
      title: "Instagram workspace status",
      description: "Check which Instagram Social AI integrations are configured. Never infer a connection from environment variables alone.",
      inputSchema: z.object({}),
    },
    async () => {
      const configured = {
        database: Boolean(process.env.DATABASE_URL),
        metaApp: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
        metaRedirect: Boolean(process.env.META_REDIRECT_URI),
        elevenLabs: Boolean(process.env.ELEVENLABS_API_KEY),
        encryptionKey: Boolean(process.env.APP_ENCRYPTION_KEY),
      };

      let accountCount = 0;
      if (db) {
        try {
          const rows = await db`SELECT COUNT(*)::int AS count FROM instagram_accounts`;
          accountCount = Number(rows[0]?.count ?? 0);
        } catch {
          return result({
            status: "database_migration_required",
            configured,
            message: "Database is reachable but the initial migration has not been applied.",
            migration: "database/migrations/0001_initial.sql",
          });
        }
      }

      return result({
        status: db ? "database_ready" : "setup_required",
        configured,
        instagramAccountsConnected: accountCount,
        publishingEnabled: false,
        messagingAutomationEnabled: false,
        note: "Publishing and outbound messaging remain disabled until official Meta OAuth, permissions, webhook handling, and explicit approval checks are implemented.",
        nextStep: db ? "Connect your Instagram professional account." : databaseUnavailableMessage(),
      });
    },
  );

  server.registerTool(
    "instagram_morning_data",
    {
      title: "Get Instagram morning briefing data",
      description: "Fetch the connected professional account profile and recent owned media so Claude can prepare the daily performance briefing. This reads data only.",
      inputSchema: z.object({
        mediaLimit: z.number().int().min(5).max(30).default(20),
      }),
    },
    async ({ mediaLimit }) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const accounts = await db`SELECT instagram_user_id, username, account_type, access_token_encrypted, token_expires_at, scopes FROM instagram_accounts ORDER BY connected_at DESC LIMIT 1`;
        const account = accounts[0] as {
          instagram_user_id: string;
          username: string;
          account_type: string | null;
          access_token_encrypted: string;
          token_expires_at: string | Date | null;
          scopes: string[];
        } | undefined;
        if (!account?.access_token_encrypted) {
          return result({ connected: false, message: "No Instagram professional account is connected yet. Start OAuth at /api/auth/instagram." });
        }

        const accessToken = decryptSecret(account.access_token_encrypted);
        const version = process.env.META_GRAPH_API_VERSION || "v25.0";
        const profileUrl = new URL(`https://graph.instagram.com/${version}/me`);
        profileUrl.searchParams.set("fields", "user_id,username,account_type,media_count,followers_count,follows_count,biography,website,profile_picture_url");
        profileUrl.searchParams.set("access_token", accessToken);

        const mediaUrl = new URL(`https://graph.instagram.com/${version}/me/media`);
        mediaUrl.searchParams.set("fields", "id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,like_count,comments_count");
        mediaUrl.searchParams.set("limit", String(mediaLimit));
        mediaUrl.searchParams.set("access_token", accessToken);

        const [profileResponse, mediaResponse] = await Promise.all([
          fetch(profileUrl, { cache: "no-store" }),
          fetch(mediaUrl, { cache: "no-store" }),
        ]);
        const profileData = await profileResponse.json() as Record<string, unknown>;
        const mediaData = await mediaResponse.json() as { data?: unknown[]; paging?: unknown; error?: unknown };
        if (!profileResponse.ok || !mediaResponse.ok) {
          return result({
            connected: true,
            account: { username: account.username, instagramUserId: account.instagram_user_id },
            error: "Meta API request failed. Check token health and granted permissions.",
            profileError: profileResponse.ok ? undefined : profileData,
            mediaError: mediaResponse.ok ? undefined : mediaData.error,
          });
        }

        return result({
          connected: true,
          account: {
            username: account.username,
            instagramUserId: account.instagram_user_id,
            accountType: account.account_type,
            tokenExpiresAt: account.token_expires_at,
            grantedScopes: account.scopes,
          },
          profile: profileData,
          recentMedia: mediaData.data ?? [],
          fetchedAt: new Date().toISOString(),
          analysisGuidance: "Distinguish observed metrics from interpretation. Do not infer reach, saves, shares, or audience demographics unless the API actually returned them.",
        });
      } catch {
        return result({ error: "Could not retrieve Instagram data. Verify the encrypted token, APP_ENCRYPTION_KEY, and Meta API permissions." });
      }
    },
  );

  server.registerTool(
    "content_ideas_list",
    {
      title: "List content ideas",
      description: "List saved Reel, Story, and carousel ideas in the creator workspace.",
      inputSchema: z.object({
        status: z.enum(["proposed", "selected", "in_production", "ready_for_review", "approved", "published", "rejected"]).optional(),
        limit: z.number().int().min(1).max(30).default(10),
      }),
    },
    async ({ status, limit }) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const rows = status
          ? await db`SELECT id, format, title, hook, summary, script, caption, cta, keyword, status, created_at FROM content_ideas WHERE status = ${status} ORDER BY created_at DESC LIMIT ${limit}`
          : await db`SELECT id, format, title, hook, summary, script, caption, cta, keyword, status, created_at FROM content_ideas ORDER BY created_at DESC LIMIT ${limit}`;
        return result({ ideas: rows });
      } catch {
        return result({ error: "Could not read content ideas. Apply the initial database migration first." });
      }
    },
  );

  server.registerTool(
    "content_idea_save",
    {
      title: "Save a content idea",
      description: "Save a content idea proposed in Claude so it can be selected and developed into a Reel, Story, or carousel. This does not publish anything.",
      inputSchema: z.object({
        format: z.enum(["reel", "story", "carousel"]),
        title: z.string().min(3).max(160),
        hook: z.string().min(3).max(500),
        summary: z.string().min(3).max(1200),
        audience: z.string().max(300).optional(),
        script: z.string().max(12000).optional(),
        caption: z.string().max(3000).optional(),
        cta: z.string().max(500).optional(),
        keyword: z.string().max(80).optional(),
        rationale: z.string().max(1200).optional(),
      }),
    },
    async (input) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const rows = await db`INSERT INTO content_ideas (format, title, hook, summary, audience, script, caption, cta, keyword, rationale, status) VALUES (${input.format}, ${input.title}, ${input.hook}, ${input.summary}, ${input.audience ?? null}, ${input.script ?? null}, ${input.caption ?? null}, ${input.cta ?? null}, ${input.keyword ?? null}, ${input.rationale ?? null}, 'proposed') RETURNING id, format, title, hook, status, created_at`;
        return result({ saved: true, idea: rows[0], note: "Idea saved as proposed. It is not approved for publication." });
      } catch {
        return result({ error: "Could not save idea. Apply the initial database migration first." });
      }
    },
  );

  server.registerTool(
    "content_idea_select",
    {
      title: "Select a content idea",
      description: "Mark one proposed content idea as selected for production. Selection is not approval to publish.",
      inputSchema: z.object({ ideaId: z.string().uuid() }),
    },
    async ({ ideaId }) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const rows = await db`UPDATE content_ideas SET status = 'selected', updated_at = NOW() WHERE id = ${ideaId} AND status IN ('proposed', 'selected') RETURNING id, title, status`;
        if (!rows.length) return result({ updated: false, reason: "Idea not found or no longer selectable." });
        return result({ updated: true, idea: rows[0], nextStep: "Create the script, storyboard, voiceover and video draft. Ask for explicit approval before publishing." });
      } catch {
        return result({ error: "Could not update idea. Apply the initial database migration first." });
      }
    },
  );

  server.registerTool(
    "approval_queue_list",
    {
      title: "List pending approvals",
      description: "Show generated content packages waiting for the creator's explicit approval. Never publish from this read operation.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(30).default(10) }),
    },
    async ({ limit }) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const rows = await db`SELECT a.id, a.action, a.status, a.created_at, i.title, i.format FROM approvals a LEFT JOIN content_ideas i ON i.id = a.content_idea_id WHERE a.status = 'pending' ORDER BY a.created_at ASC LIMIT ${limit}`;
        return result({ approvals: rows, publishingNote: "No approval has been granted by listing this queue." });
      } catch {
        return result({ error: "Could not read approvals. Apply the initial database migration first." });
      }
    },
  );

  server.registerPrompt(
    "morning_creator_briefing",
    {
      title: "Morning creator briefing",
      description: "Guide Claude through the daily Instagram account and niche briefing, then propose three content ideas.",
      argsSchema: {},
    },
    async () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "Prepare my 7:00 AM creator briefing. First check instagram_workspace_status. If my Instagram account is connected, call instagram_morning_data to fetch the account profile and recent owned media. Analyze only the metrics returned by the API; do not invent reach, saves, shares, demographics or engagement data. Compare with saved historical reports when available, and research niche trends separately. Clearly separate measured account facts from external observations and assumptions. Then give me exactly three Reel concepts, each with a strong hook, audience, core insight, scene-by-scene motion-graphics direction, suggested CTA, and why it is timely. Save the three ideas with content_idea_save. Do not generate or publish anything until I choose one.",
        },
      }],
    }),
  );

  return server;
}, { responseMode: "json" });

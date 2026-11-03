import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { createHash } from "node:crypto";
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
        const version = process.env.META_GRAPH_API_VERSION || "v26.0";
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
    "elevenlabs_generate_voiceover",
    {
      title: "Generate voiceover with ElevenLabs",
      description: "Generate an MP3 voiceover from an approved script using the configured ElevenLabs voice. Stores the audio as a private media asset. This does not publish content.",
      inputSchema: z.object({
        script: z.string().min(20).max(10000),
        contentIdeaId: z.string().uuid().optional(),
        voiceId: z.string().min(1).max(120).optional(),
        modelId: z.string().min(1).max(120).optional(),
      }),
    },
    async ({ script, contentIdeaId, voiceId, modelId }) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      const apiKey = process.env.ELEVENLABS_API_KEY;
      const selectedVoice = voiceId || process.env.ELEVENLABS_VOICE_ID;
      const selectedModel = modelId || process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
      if (!apiKey || !selectedVoice) {
        return result({ error: "ElevenLabs is not configured. Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID to the server environment." });
      }

      try {
        const endpoint = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(selectedVoice)}`);
        endpoint.searchParams.set("output_format", "mp3_44100_128");
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "content-type": "application/json",
            accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: script,
            model_id: selectedModel,
            voice_settings: {
              stability: 0.48,
              similarity_boost: 0.78,
              style: 0.12,
              use_speaker_boost: true,
            },
          }),
          cache: "no-store",
        });

        if (!response.ok) {
          const providerError = await response.text();
          return result({
            generated: false,
            providerStatus: response.status,
            error: providerError.slice(0, 500),
            note: "Check ElevenLabs account credits, API access, voice permissions, and model availability.",
          });
        }

        const audio = Buffer.from(await response.arrayBuffer());
        if (!audio.byteLength || audio.byteLength > 15 * 1024 * 1024) {
          return result({ generated: false, error: "Audio output was empty or exceeded the 15 MB development storage limit." });
        }

        const metadata = JSON.stringify({
          provider: "elevenlabs",
          modelId: selectedModel,
          voiceId: selectedVoice,
          characters: script.length,
          bytes: audio.byteLength,
        });
        const assets = await db`INSERT INTO media_assets (content_idea_id, asset_type, storage_url, metadata) VALUES (${contentIdeaId ?? null}, 'voiceover', 'pending', ${metadata}::jsonb) RETURNING id`;
        const assetId = String(assets[0]?.id ?? "");
        if (!assetId) throw new Error("media_asset_insert_failed");

        const fileName = `voiceover-${assetId}.mp3`;
        await db`INSERT INTO media_asset_blobs (asset_id, mime_type, file_name, content_base64) VALUES (${assetId}, 'audio/mpeg', ${fileName}, ${audio.toString("base64")})`;

        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
        const downloadUrl = `${appUrl}/api/media/assets/${assetId}`;
        await db`UPDATE media_assets SET storage_url = ${downloadUrl} WHERE id = ${assetId}`;

        return result({
          generated: true,
          assetId,
          downloadUrl,
          mimeType: "audio/mpeg",
          fileName,
          characters: script.length,
          bytes: audio.byteLength,
          modelId: selectedModel,
          note: "Voiceover generated and stored. Download it with the protected asset URL, then render the Reel locally. No Instagram post has been published.",
        });
      } catch {
        return result({ generated: false, error: "Voiceover generation or asset storage failed. Check provider access, Neon connectivity, and media_asset_blobs migration." });
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
    "content_idea_update",
    {
      title: "Update a content production draft",
      description: "Save the final script, scene-by-scene storyboard, caption and keyword CTA for a selected content idea. This does not approve or publish it.",
      inputSchema: z.object({
        ideaId: z.string().uuid(),
        script: z.string().min(20).max(12000).optional(),
        storyboard: z.array(z.object({
          sceneNumber: z.number().int().min(1).max(30),
          durationSeconds: z.number().positive().max(20),
          visualDirection: z.string().min(2).max(800),
          onScreenText: z.string().max(300).optional(),
          voiceoverLine: z.string().max(1200).optional(),
        })).max(30).optional(),
        caption: z.string().max(3000).optional(),
        cta: z.string().max(500).optional(),
        keyword: z.string().max(80).optional(),
      }).refine((value) => Object.keys(value).some((key) => key !== "ideaId" && value[key as keyof typeof value] !== undefined)),
    },
    async ({ ideaId, script, storyboard, caption, cta, keyword }) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const storyboardJson = storyboard ? JSON.stringify(storyboard) : null;
        const rows = await db`UPDATE content_ideas SET
          script = COALESCE(${script ?? null}, script),
          storyboard = COALESCE(${storyboardJson}::jsonb, storyboard),
          caption = COALESCE(${caption ?? null}, caption),
          cta = COALESCE(${cta ?? null}, cta),
          keyword = COALESCE(${keyword ?? null}, keyword),
          status = 'in_production',
          updated_at = NOW()
          WHERE id = ${ideaId} AND status IN ('selected', 'in_production', 'ready_for_review')
          RETURNING id, title, format, script, storyboard, caption, cta, keyword, status`;
        if (!rows.length) return result({ updated: false, reason: "Idea not found or not in a production state." });
        return result({ updated: true, idea: rows[0], nextStep: "Generate the voiceover and render the video. Then request explicit creator approval." });
      } catch {
        return result({ updated: false, error: "Could not update the content idea." });
      }
    },
  );

  server.registerTool(
    "content_approval_request",
    {
      title: "Request approval to publish content",
      description: "Create a pending approval for a completed content version. The approval is bound to a SHA-256 hash of the idea and its media assets. It never publishes by itself.",
      inputSchema: z.object({
        ideaId: z.string().uuid(),
        action: z.enum(["publish_reel", "publish_post", "publish_story"]),
      }),
    },
    async ({ ideaId, action }) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const ideas = await db`SELECT id, format, title, hook, summary, script, storyboard, caption, cta, keyword, status FROM content_ideas WHERE id = ${ideaId} LIMIT 1`;
        const idea = ideas[0];
        if (!idea) return result({ requested: false, reason: "Content idea not found." });
        const assets = await db`SELECT id, asset_type, storage_url, metadata FROM media_assets WHERE content_idea_id = ${ideaId} ORDER BY created_at ASC`;
        const hasVideo = assets.some((asset) => asset.asset_type === "video");
        const hasCover = assets.some((asset) => asset.asset_type === "cover");
        if (action === "publish_reel" && !hasVideo) {
          return result({ requested: false, reason: "A rendered video asset is required before requesting Reel approval." });
        }
        if (!idea.caption) return result({ requested: false, reason: "A caption is required before requesting approval." });

        const contentHash = createHash("sha256").update(JSON.stringify({
          idea,
          assets: assets.map((asset) => ({ id: asset.id, type: asset.asset_type, storageUrl: asset.storage_url, metadata: asset.metadata })),
        })).digest("hex");
        await db`UPDATE content_ideas SET status = 'ready_for_review', updated_at = NOW() WHERE id = ${ideaId}`;
        const approvals = await db`INSERT INTO approvals (content_idea_id, action, content_hash, status) VALUES (${ideaId}, ${action}, ${contentHash}, 'pending') RETURNING id, action, status, created_at`;
        return result({
          requested: true,
          approval: approvals[0],
          content: { title: idea.title, format: idea.format, caption: idea.caption, cta: idea.cta, keyword: idea.keyword },
          assets: assets.map((asset) => ({ id: asset.id, type: asset.asset_type, url: asset.storage_url })),
          hasCover,
          contentHash,
          note: "Show the preview and all publishing details to the creator. Only call content_approval_decide with decision=approve after they explicitly say yes.",
        });
      } catch {
        return result({ requested: false, error: "Could not create approval request." });
      }
    },
  );

  server.registerTool(
    "content_approval_decide",
    {
      title: "Record creator approval decision",
      description: "Record the creator's explicit approval or rejection for one exact content version. Approval alone does not publish; a separate publish tool must validate the content hash again.",
      inputSchema: z.object({
        approvalId: z.string().uuid(),
        decision: z.enum(["approve", "reject"]),
      }),
    },
    async ({ approvalId, decision }) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const status = decision === "approve" ? "approved" : "rejected";
        const rows = await db`UPDATE approvals SET status = ${status}, approved_by = ${decision === "approve" ? "creator" : null}, approved_at = ${decision === "approve" ? new Date().toISOString() : null} WHERE id = ${approvalId} AND status = 'pending' RETURNING id, content_idea_id, action, content_hash, status, approved_at`;
        if (!rows.length) return result({ recorded: false, reason: "Approval request not found or already decided." });
        const approval = rows[0];
        await db`UPDATE content_ideas SET status = ${decision === "approve" ? "approved" : "in_production"}, updated_at = NOW() WHERE id = ${approval.content_idea_id}`;
        return result({
          recorded: true,
          approval,
          published: false,
          nextStep: decision === "approve" ? "The exact content version is approved. Call the publish tool only after verifying its content hash and required media." : "The draft was rejected. Revise it and request approval again.",
        });
      } catch {
        return result({ recorded: false, error: "Could not record the approval decision." });
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

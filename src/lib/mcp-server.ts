import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { createHash } from "node:crypto";
import * as z from "zod/v4";
import { db, databaseUnavailableMessage } from "@/lib/db";
import { decryptSecret, signPublicMediaUrl } from "@/lib/crypto";

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
    "instagram_subscribe_webhooks",
    {
      title: "Subscribe Instagram account to webhooks",
      description: "Subscribe the connected Instagram professional account to comments, messages and messaging postbacks after the Meta app webhook is configured.",
      inputSchema: z.object({}),
    },
    async () => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const accounts = await db`SELECT instagram_user_id, access_token_encrypted FROM instagram_accounts ORDER BY connected_at DESC LIMIT 1`;
        const account = accounts[0] as { instagram_user_id: string; access_token_encrypted: string } | undefined;
        if (!account?.access_token_encrypted) return result({ subscribed: false, reason: "No Instagram account is connected." });
        const accessToken = decryptSecret(account.access_token_encrypted);
        const version = process.env.META_GRAPH_API_VERSION || "v26.0";
        const url = new URL(`https://graph.instagram.com/${version}/${account.instagram_user_id}/subscribed_apps`);
        url.searchParams.set("subscribed_fields", "comments,messages,messaging_postbacks");
        url.searchParams.set("access_token", accessToken);
        const response = await fetch(url, { method: "POST", cache: "no-store" });
        const data = await response.json() as { success?: boolean; error?: { message?: string } };
        if (!response.ok || data.success === false) {
          return result({ subscribed: false, providerError: data.error?.message ?? "Meta did not confirm webhook subscription." });
        }
        return result({ subscribed: true, fields: ["comments", "messages", "messaging_postbacks"], note: "Also configure the Instagram webhook callback URL and verify token in Meta Developer Dashboard." });
      } catch {
        return result({ subscribed: false, error: "Could not subscribe the Instagram account to webhooks." });
      }
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
        resourceUrl: z.string().url().max(2000).optional(),
        dmMessage: z.string().max(1000).optional(),
        requiresFollow: z.boolean().optional(),
      }).refine((value) => Object.keys(value).some((key) => key !== "ideaId" && value[key as keyof typeof value] !== undefined)),
    },
    async ({ ideaId, script, storyboard, caption, cta, keyword, resourceUrl, dmMessage, requiresFollow }) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const storyboardJson = storyboard ? JSON.stringify(storyboard) : null;
        const rows = await db`UPDATE content_ideas SET
          script = COALESCE(${script ?? null}, script),
          storyboard = COALESCE(${storyboardJson}::jsonb, storyboard),
          caption = COALESCE(${caption ?? null}, caption),
          cta = COALESCE(${cta ?? null}, cta),
          keyword = COALESCE(${keyword ?? null}, keyword),
          resource_url = COALESCE(${resourceUrl ?? null}, resource_url),
          dm_message = COALESCE(${dmMessage ?? null}, dm_message),
          requires_follow = COALESCE(${requiresFollow ?? null}, requires_follow),
          status = 'in_production',
          updated_at = NOW()
          WHERE id = ${ideaId} AND status IN ('selected', 'in_production', 'ready_for_review')
          RETURNING id, title, format, script, storyboard, caption, cta, keyword, resource_url, dm_message, requires_follow, status`;
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
        const ideas = await db`SELECT id, format, title, hook, summary, script, storyboard, caption, cta, keyword, resource_url, dm_message, requires_follow, status FROM content_ideas WHERE id = ${ideaId} LIMIT 1`;
        const idea = ideas[0];
        if (!idea) return result({ requested: false, reason: "Content idea not found." });
        const assets = await db`SELECT id, asset_type, storage_url, metadata FROM media_assets WHERE content_idea_id = ${ideaId} ORDER BY created_at ASC`;
        const hasVideo = assets.some((asset) => asset.asset_type === "video");
        const hasCover = assets.some((asset) => asset.asset_type === "cover");
        if (action === "publish_reel" && (!hasVideo || !hasCover)) {
          return result({ requested: false, reason: "A rendered video and cover image are required before requesting Reel approval." });
        }
        if (!idea.caption) return result({ requested: false, reason: "A caption is required before requesting approval." });

        const ideaSnapshot = {
          id: idea.id, format: idea.format, title: idea.title, hook: idea.hook,
          summary: idea.summary, script: idea.script, storyboard: idea.storyboard,
          caption: idea.caption, cta: idea.cta, keyword: idea.keyword,
          resource_url: idea.resource_url, dm_message: idea.dm_message, requires_follow: idea.requires_follow,
        };
        const assetSnapshot = assets.map((asset) => ({
          id: asset.id, type: asset.asset_type, storageUrl: asset.storage_url, metadata: asset.metadata,
        }));
        const contentHash = createHash("sha256").update(JSON.stringify({
          idea: ideaSnapshot,
          assets: assetSnapshot,
        })).digest("hex");
        await db`UPDATE content_ideas SET status = 'ready_for_review', updated_at = NOW() WHERE id = ${ideaId}`;
        const approvals = await db`INSERT INTO approvals (content_idea_id, action, content_hash, status) VALUES (${ideaId}, ${action}, ${contentHash}, 'pending') RETURNING id, action, status, created_at`;
        return result({
          requested: true,
          approval: approvals[0],
          content: { title: idea.title, format: idea.format, caption: idea.caption, cta: idea.cta, keyword: idea.keyword, resourceUrl: idea.resource_url, dmMessage: idea.dm_message, requiresFollow: idea.requires_follow },
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
    "instagram_publish_approved",
    {
      title: "Prepare approved Instagram Reel for publishing",
      description: "Create an Instagram Reel media container only when a creator-approved approval record exists and its content hash still matches the exact saved script, caption, video and cover assets. This prepares the publish job but does not finalize the post.",
      inputSchema: z.object({ approvalId: z.string().uuid() }),
    },
    async ({ approvalId }) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const rows = await db`SELECT a.id, a.content_idea_id, a.action, a.status, a.content_hash, a.provider_container_id, a.published_media_id,
          i.format, i.title, i.hook, i.summary, i.script, i.storyboard, i.caption, i.cta, i.keyword, i.resource_url, i.dm_message, i.requires_follow
          FROM approvals a JOIN content_ideas i ON i.id = a.content_idea_id WHERE a.id = ${approvalId} LIMIT 1`;
        const approval = rows[0] as Record<string, unknown> | undefined;
        if (!approval) return result({ prepared: false, reason: "Approval request not found." });
        if (approval.status !== "approved") return result({ prepared: false, reason: "Creator approval is required before publishing." });
        if (approval.published_media_id) return result({ prepared: false, alreadyPublished: true, instagramMediaId: approval.published_media_id });
        if (approval.action !== "publish_reel") return result({ prepared: false, reason: "Only Reel publishing is implemented in this milestone." });
        if (!approval.caption) return result({ prepared: false, reason: "Approved caption is missing." });

        const assets = await db`SELECT id, asset_type, storage_url, metadata FROM media_assets WHERE content_idea_id = ${approval.content_idea_id} ORDER BY created_at ASC`;
        const video = assets.find((asset) => asset.asset_type === "video");
        const cover = assets.find((asset) => asset.asset_type === "cover");
        if (!video || !cover) return result({ prepared: false, reason: "Rendered Reel video and cover assets are required." });

        const ideaSnapshot = {
          id: approval.content_idea_id, format: approval.format, title: approval.title, hook: approval.hook,
          summary: approval.summary, script: approval.script, storyboard: approval.storyboard,
          caption: approval.caption, cta: approval.cta, keyword: approval.keyword,
          resource_url: approval.resource_url, dm_message: approval.dm_message, requires_follow: approval.requires_follow,
        };
        const assetSnapshot = assets.map((asset) => ({
          id: asset.id, type: asset.asset_type, storageUrl: asset.storage_url, metadata: asset.metadata,
        }));
        const currentHash = createHash("sha256").update(JSON.stringify({
          idea: ideaSnapshot,
          assets: assetSnapshot,
        })).digest("hex");
        if (currentHash !== approval.content_hash) {
          return result({ prepared: false, reason: "Content changed after approval. Generate a new approval for the latest version." });
        }

        if (approval.provider_container_id) {
          return result({ prepared: true, existingContainer: true, containerId: approval.provider_container_id, nextStep: "Call instagram_publish_finalize to check processing and publish when ready." });
        }

        const accounts = await db`SELECT instagram_user_id, access_token_encrypted FROM instagram_accounts ORDER BY connected_at DESC LIMIT 1`;
        const account = accounts[0] as { instagram_user_id: string; access_token_encrypted: string } | undefined;
        if (!account?.access_token_encrypted) return result({ prepared: false, reason: "No Instagram account is connected." });

        const accessToken = decryptSecret(account.access_token_encrypted);
        const version = process.env.META_GRAPH_API_VERSION || "v26.0";
        const baseUrlRaw = process.env.NEXT_PUBLIC_APP_URL || "";
        const baseUrl = baseUrlRaw.endsWith("/") ? baseUrlRaw.slice(0, -1) : baseUrlRaw;
        if (!baseUrl) return result({ prepared: false, reason: "NEXT_PUBLIC_APP_URL is not configured." });
        const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
        const signedUrl = (assetId: string) => {
          const signature = signPublicMediaUrl(assetId, expiresAt);
          return `${baseUrl}/api/media/public/${assetId}?expires=${expiresAt}&sig=${signature}`;
        };

        const params = new URLSearchParams({
          media_type: "REELS",
          video_url: signedUrl(String(video.id)),
          caption: String(approval.caption),
          share_to_feed: "true",
          access_token: accessToken,
        });
        if (cover) params.set("cover_url", signedUrl(String(cover.id)));

        const createUrl = `https://graph.instagram.com/${version}/${account.instagram_user_id}/media`;
        const response = await fetch(createUrl, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: params,
          cache: "no-store",
        });
        const data = await response.json() as { id?: string; error?: { message?: string; code?: number } };
        if (!response.ok || !data.id) {
          return result({ prepared: false, providerError: data.error?.message ?? "Meta could not create a Reel container.", providerCode: data.error?.code });
        }

        await db`UPDATE approvals SET provider_container_id = ${data.id} WHERE id = ${approvalId} AND status = 'approved'`;
        return result({
          prepared: true,
          containerId: data.id,
          videoAssetId: video.id,
          coverAssetId: cover?.id ?? null,
          nextStep: "Call instagram_publish_finalize. It will publish only after Meta reports the container as FINISHED.",
        });
      } catch {
        return result({ prepared: false, error: "Could not prepare the approved Reel. Verify Meta permissions, token health, signed media URLs, and content hash." });
      }
    },
  );

  server.registerTool(
    "instagram_publish_finalize",
    {
      title: "Finalize approved Instagram Reel publication",
      description: "Check the Meta media container and publish it only when Meta reports FINISHED. The operation is idempotent and records the resulting Instagram media ID.",
      inputSchema: z.object({ approvalId: z.string().uuid() }),
    },
    async ({ approvalId }) => {
      if (!db) return result({ error: databaseUnavailableMessage() });
      try {
        const rows = await db`SELECT a.id, a.content_idea_id, a.action, a.status, a.provider_container_id, a.published_media_id,
          i.title, i.keyword, i.resource_url, i.dm_message, i.requires_follow FROM approvals a JOIN content_ideas i ON i.id = a.content_idea_id WHERE a.id = ${approvalId} LIMIT 1`;
        const approval = rows[0] as { id: string; content_idea_id: string; action: string; status: string; provider_container_id: string | null; published_media_id: string | null; title: string; keyword: string | null; resource_url: string | null; dm_message: string | null; requires_follow: boolean } | undefined;
        if (!approval) return result({ published: false, reason: "Approval request not found." });
        if (approval.status !== "approved") return result({ published: false, reason: "Creator approval is required." });
        if (approval.published_media_id) return result({ published: true, alreadyPublished: true, instagramMediaId: approval.published_media_id });
        if (approval.action !== "publish_reel" || !approval.provider_container_id) {
          return result({ published: false, reason: "No approved Reel container is ready. Call instagram_publish_approved first." });
        }

        const accounts = await db`SELECT instagram_user_id, access_token_encrypted FROM instagram_accounts ORDER BY connected_at DESC LIMIT 1`;
        const account = accounts[0] as { instagram_user_id: string; access_token_encrypted: string } | undefined;
        if (!account?.access_token_encrypted) return result({ published: false, reason: "No Instagram account is connected." });
        const accessToken = decryptSecret(account.access_token_encrypted);
        const version = process.env.META_GRAPH_API_VERSION || "v26.0";

        const statusUrl = new URL(`https://graph.instagram.com/${version}/${approval.provider_container_id}`);
        statusUrl.searchParams.set("fields", "status_code,status");
        statusUrl.searchParams.set("access_token", accessToken);
        const statusResponse = await fetch(statusUrl, { cache: "no-store" });
        const statusData = await statusResponse.json() as { status_code?: string; status?: string; error?: { message?: string } };
        if (!statusResponse.ok) return result({ published: false, error: statusData.error?.message ?? "Could not read Meta container status." });
        if (statusData.status_code === "ERROR" || statusData.status_code === "EXPIRED") {
          return result({ published: false, containerStatus: statusData.status_code, detail: statusData.status });
        }
        if (statusData.status_code !== "FINISHED") {
          return result({ published: false, ready: false, containerStatus: statusData.status_code ?? "UNKNOWN", detail: statusData.status, nextStep: "Call instagram_publish_finalize again after Meta finishes processing the video." });
        }

        const publishParams = new URLSearchParams({
          creation_id: approval.provider_container_id,
          access_token: accessToken,
        });
        const publishResponse = await fetch(`https://graph.instagram.com/${version}/${account.instagram_user_id}/media_publish`, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: publishParams,
          cache: "no-store",
        });
        const publishedData = await publishResponse.json() as { id?: string; error?: { message?: string } };
        if (!publishResponse.ok || !publishedData.id) {
          return result({ published: false, providerError: publishedData.error?.message ?? "Meta did not confirm publication." });
        }

        await db`UPDATE approvals SET published_media_id = ${publishedData.id}, published_at = NOW() WHERE id = ${approvalId} AND published_media_id IS NULL`;
        await db`UPDATE content_ideas SET status = 'published', updated_at = NOW() WHERE id = ${approval.content_idea_id}`;
        let automationRuleId: string | null = null;
        if (approval.keyword && approval.resource_url) {
          const rules = await db`INSERT INTO automation_rules (creator_id, content_idea_id, instagram_media_id, rule_type, keyword, response_template, resource_url, requires_follow, enabled)
            SELECT creator_id, ${approval.content_idea_id}, ${publishedData.id}, 'comment_keyword', ${approval.keyword},
              ${approval.dm_message ?? "¡Gracias por comentar! Para recibir el recurso, seguime y tocá «Ya seguí»."},
              ${approval.resource_url}, ${approval.requires_follow}, TRUE
            FROM instagram_accounts WHERE instagram_user_id = ${account.instagram_user_id}
            RETURNING id`;
          automationRuleId = rules[0]?.id ? String(rules[0].id) : null;
        }
        await db`INSERT INTO audit_log (actor, action, target_type, target_id, details) VALUES ('system', 'instagram_reel_published', 'instagram_media', ${publishedData.id}, ${JSON.stringify({ approvalId, contentIdeaId: approval.content_idea_id, title: approval.title })}::jsonb)`;
        return result({ published: true, instagramMediaId: publishedData.id, title: approval.title, approvalId, commentAutomationRuleId: automationRuleId, commentAutomationEnabled: Boolean(automationRuleId) });
      } catch {
        return result({ published: false, error: "Could not finalize Instagram publication. Verify token, permissions, container state, and audit storage." });
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

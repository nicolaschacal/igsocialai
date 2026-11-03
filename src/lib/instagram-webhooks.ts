import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

type ConnectedAccount = {
  instagram_user_id: string;
  access_token_encrypted: string;
};

async function getAccount() {
  if (!db) throw new Error("Database unavailable");
  const rows = await db`SELECT instagram_user_id, access_token_encrypted FROM instagram_accounts ORDER BY connected_at DESC LIMIT 1`;
  const account = rows[0] as ConnectedAccount | undefined;
  if (!account?.access_token_encrypted) throw new Error("Instagram account not connected");
  return { id: account.instagram_user_id, token: decryptSecret(account.access_token_encrypted) };
}

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

async function sendInstagramMessage(
  accountId: string,
  token: string,
  recipient: Record<string, string>,
  text: string,
  quickReply?: { title: string; payload: string },
) {
  const version = process.env.META_GRAPH_API_VERSION || "v26.0";
  const url = new URL(`https://graph.instagram.com/${version}/${accountId}/messages`);
  url.searchParams.set("access_token", token);
  const message: Record<string, unknown> = { text };
  if (quickReply) {
    message.quick_replies = [{
      content_type: "text",
      title: quickReply.title,
      payload: quickReply.payload,
    }];
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipient, message }),
    cache: "no-store",
  });
  const data = await response.json() as { message_id?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? "Instagram message send failed");
  return data;
}

async function claimWebhookEvent(eventId: string, eventType: string, payload: unknown) {
  if (!db) throw new Error("Database unavailable");
  const inserted = await db`INSERT INTO webhook_events (provider, event_id, event_type, payload) VALUES ('meta', ${eventId}, ${eventType}, ${JSON.stringify(payload)}::jsonb) ON CONFLICT (provider, event_id) DO NOTHING RETURNING id`;
  if (inserted.length) return { id: inserted[0].id, alreadyProcessed: false };
  const existing = await db`SELECT id, processed_at FROM webhook_events WHERE provider = 'meta' AND event_id = ${eventId} LIMIT 1`;
  if (!existing.length || existing[0].processed_at) return { id: existing[0]?.id, alreadyProcessed: true };
  return { id: existing[0].id, alreadyProcessed: false };
}

async function markWebhookProcessed(eventId: string) {
  if (!db) return;
  await db`UPDATE webhook_events SET processed_at = NOW() WHERE provider = 'meta' AND event_id = ${eventId}`;
}

async function processComment(value: Record<string, unknown>) {
  if (!db) throw new Error("Database unavailable");
  const commentId = String(value.id ?? "");
  const commentText = String(value.text ?? "");
  const from = value.from as { id?: string; username?: string } | undefined;
  const media = value.media as { id?: string } | undefined;
  const mediaId = String(media?.id ?? "");
  const senderId = String(from?.id ?? "");
  if (!commentId || !mediaId || !senderId || !commentText) return;

  const eventId = `comment:${commentId}`;
  const claim = await claimWebhookEvent(eventId, "instagram_comment", value);
  if (claim.alreadyProcessed) return;

  const account = await getAccount();
  if (senderId === account.id) {
    await markWebhookProcessed(eventId);
    return;
  }

  const normalizedComment = ` ${normalize(commentText)} `;
  const rules = await db`SELECT id, keyword, response_template, resource_url, requires_follow FROM automation_rules WHERE enabled = TRUE AND instagram_media_id = ${mediaId} ORDER BY created_at DESC`;
  const rule = rules.find((candidate) => {
    const keyword = normalize(String(candidate.keyword ?? ""));
    return keyword.length > 0 && normalizedComment.includes(` ${keyword} `);
  });
  if (!rule) {
    await markWebhookProcessed(eventId);
    return;
  }

  await db`INSERT INTO automation_contact_states (automation_rule_id, contact_igsid, status, last_interaction_at) VALUES (${rule.id}, ${senderId}, 'awaiting_user_action', NOW()) ON CONFLICT (automation_rule_id, contact_igsid) DO UPDATE SET status = 'awaiting_user_action', last_interaction_at = NOW(), last_follow_check = NULL, delivered_at = NULL, updated_at = NOW()`;

  const requiresFollow = Boolean(rule.requires_follow);
  const defaultText = requiresFollow
    ? "¡Gracias por comentar! Para recibir el recurso, seguime y después tocá «Ya seguí» acá abajo."
    : "¡Gracias por comentar! Tocá el botón y te envío el recurso.";
  await sendInstagramMessage(
    account.id,
    account.token,
    { comment_id: commentId },
    String(rule.response_template || defaultText),
    { title: requiresFollow ? "Ya seguí" : "Recibir recurso", payload: `IGSAI_FOLLOW:${rule.id}` },
  );
  await markWebhookProcessed(eventId);
}

async function processInboundMessage(event: Record<string, unknown>) {
  if (!db) throw new Error("Database unavailable");
  const message = event.message as {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    quick_reply?: { payload?: string };
  } | undefined;
  if (!message || message.is_echo) return;

  const sender = event.sender as { id?: string } | undefined;
  const senderId = String(sender?.id ?? "");
  if (!senderId) return;

  const payload = String(message.quick_reply?.payload ?? (event.postback as { payload?: string } | undefined)?.payload ?? "");
  const typedText = normalize(String(message.text ?? ""));
  const isFollowConfirmation = ["ya segui", "ya te segui", "listo", "ya esta", "seguir"].includes(typedText);
  const explicitRuleId = payload.startsWith("IGSAI_FOLLOW:") ? payload.slice("IGSAI_FOLLOW:".length) : "";

  const eventId = `message:${message.mid ?? `${senderId}:${String(event.timestamp ?? Date.now())}:${payload || typedText}`}`;
  const claim = await claimWebhookEvent(eventId, "instagram_message", event);
  if (claim.alreadyProcessed) return;

  let stateRows: Array<Record<string, any>> = [];
  if (explicitRuleId && /^[0-9a-f-]{36}$/i.test(explicitRuleId)) {
    stateRows = await db`SELECT s.automation_rule_id, s.status, r.resource_url, r.requires_follow, r.enabled FROM automation_contact_states s JOIN automation_rules r ON r.id = s.automation_rule_id WHERE s.automation_rule_id = ${explicitRuleId} AND s.contact_igsid = ${senderId} LIMIT 1`;
  } else if (isFollowConfirmation) {
    stateRows = await db`SELECT s.automation_rule_id, s.status, r.resource_url, r.requires_follow, r.enabled FROM automation_contact_states s JOIN automation_rules r ON r.id = s.automation_rule_id WHERE s.contact_igsid = ${senderId} AND s.status IN ('awaiting_user_action', 'awaiting_follow') AND r.enabled = TRUE ORDER BY s.updated_at DESC LIMIT 1`;
  } else {
    await markWebhookProcessed(eventId);
    return;
  }

  const state = stateRows?.[0] as {
    automation_rule_id: string;
    status: string;
    resource_url: string | null;
    requires_follow: boolean;
    enabled: boolean;
  } | undefined;
  if (!state || !state.enabled || state.status === "delivered" || !state.resource_url) {
    await markWebhookProcessed(eventId);
    return;
  }

  const account = await getAccount();
  await db`UPDATE automation_contact_states SET last_interaction_at = NOW(), updated_at = NOW() WHERE automation_rule_id = ${state.automation_rule_id} AND contact_igsid = ${senderId}`;

  if (state.requires_follow) {
    const version = process.env.META_GRAPH_API_VERSION || "v26.0";
    const profileUrl = new URL(`https://graph.instagram.com/${version}/${senderId}`);
    profileUrl.searchParams.set("fields", "is_user_follow_business,username");
    profileUrl.searchParams.set("access_token", account.token);
    const profileResponse = await fetch(profileUrl, { cache: "no-store" });
    const profile = await profileResponse.json() as { is_user_follow_business?: boolean; username?: string; error?: { message?: string } };

    if (!profileResponse.ok || typeof profile.is_user_follow_business !== "boolean") {
      await sendInstagramMessage(
        account.id,
        account.token,
        { id: senderId },
        "No pude verificar tu seguimiento en este momento. Volvé a tocar «Ya seguí» dentro de unos segundos.",
        { title: "Ya seguí", payload: `IGSAI_FOLLOW:${state.automation_rule_id}` },
      );
      await markWebhookProcessed(eventId);
      return;
    }

    await db`UPDATE automation_contact_states SET last_follow_check = ${profile.is_user_follow_business}, status = ${profile.is_user_follow_business ? "awaiting_user_action" : "awaiting_follow"}, updated_at = NOW() WHERE automation_rule_id = ${state.automation_rule_id} AND contact_igsid = ${senderId}`;
    if (!profile.is_user_follow_business) {
      await sendInstagramMessage(
        account.id,
        account.token,
        { id: senderId },
        "Todavía no me aparece que me sigas. Seguime en Instagram y después volvé a tocar «Ya seguí».",
        { title: "Ya seguí", payload: `IGSAI_FOLLOW:${state.automation_rule_id}` },
      );
      await markWebhookProcessed(eventId);
      return;
    }
  }

  await sendInstagramMessage(
    account.id,
    account.token,
    { id: senderId },
    `¡Listo! Acá tenés el recurso que te prometí: ${state.resource_url}`,
  );
  await db`UPDATE automation_contact_states SET status = 'delivered', delivered_at = NOW(), updated_at = NOW() WHERE automation_rule_id = ${state.automation_rule_id} AND contact_igsid = ${senderId}`;
  await markWebhookProcessed(eventId);
}

export async function processInstagramWebhook(payload: {
  entry?: Array<{
    id?: string;
    changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
    messaging?: Array<Record<string, unknown>>;
  }>;
}) {
  if (!db) throw new Error("Database unavailable");
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === "comments" && change.value) await processComment(change.value);
    }
    for (const event of entry.messaging ?? []) {
      await processInboundMessage(event);
    }
  }
}

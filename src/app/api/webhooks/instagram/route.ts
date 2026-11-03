import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processInstagramWebhook } from "@/lib/instagram-webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.META_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

function validSignature(rawBody: string, signature: string, appSecret: string) {
  if (!signature.startsWith("sha256=")) return false;
  const supplied = Buffer.from(signature.slice(7), "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return NextResponse.json({ error: "Meta webhook is not configured" }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  if (!validSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as {
      object?: string;
      entry?: Array<{
        id?: string;
        changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
        messaging?: Array<Record<string, unknown>>;
      }>;
    };
    if (payload.object !== "instagram") {
      return NextResponse.json({ received: true, ignored: "unsupported_object" });
    }

    await processInstagramWebhook(payload);
    return NextResponse.json({ received: true });
  } catch {
    // A 500 asks Meta to retry. Event IDs are stored idempotently in Neon.
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

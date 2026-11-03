import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPublicMediaUrl } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "Media storage unavailable" }, { status: 503 });
  const { id } = await context.params;
  const url = new URL(request.url);
  const expires = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("sig") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !verifyPublicMediaUrl(id, expires, signature)) {
    return NextResponse.json({ error: "Invalid or expired media URL" }, { status: 403 });
  }

  try {
    const rows = await db`SELECT mime_type, file_name, content_base64 FROM media_asset_blobs WHERE asset_id = ${id} LIMIT 1`;
    const asset = rows[0] as { mime_type: string; file_name: string; content_base64: string } | undefined;
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    const bytes = Buffer.from(asset.content_base64, "base64");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": asset.mime_type,
        "content-length": String(bytes.byteLength),
        "content-disposition": `inline; filename="${asset.file_name.replace(/["\\\\]/g, "")}"`,
        "cache-control": "private, max-age=60",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not read media asset" }, { status: 500 });
  }
}

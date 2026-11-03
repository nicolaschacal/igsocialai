import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

const voiceAssetId = process.argv[2];
const contentIdeaId = process.argv[3];
const rawBaseUrl = process.env.IGSOCIALAI_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
const token = process.env.MCP_ACCESS_TOKEN;
const databaseUrl = process.env.DATABASE_URL;

if (!voiceAssetId || !contentIdeaId) {
  console.error("Usage: npm run render:reel -- <voiceover-asset-id> <content-idea-id>");
  process.exit(1);
}
if (!baseUrl || !token || !databaseUrl) {
  console.error("Set IGSOCIALAI_URL, MCP_ACCESS_TOKEN and DATABASE_URL in .env.local first.");
  process.exit(1);
}
if (!/^[0-9a-f-]{36}$/i.test(contentIdeaId)) {
  console.error("The content idea ID must be a valid UUID.");
  process.exit(1);
}

const sql = neon(databaseUrl);
const ideas = await sql`SELECT id, title, script, storyboard, keyword, cta FROM content_ideas WHERE id = ${contentIdeaId} LIMIT 1`;
const idea = ideas[0];
if (!idea) {
  console.error("Content idea not found.");
  process.exit(1);
}

const storyboard = typeof idea.storyboard === "string" ? JSON.parse(idea.storyboard) : idea.storyboard;
if (!Array.isArray(storyboard) || storyboard.length < 2) {
  console.error("This content idea needs a scene-by-scene storyboard before rendering.");
  process.exit(1);
}

const accountRows = await sql`SELECT username FROM instagram_accounts ORDER BY connected_at DESC LIMIT 1`;
const handle = accountRows[0]?.username ? `@${accountRows[0].username}` : "@creator";
const keyword = String(idea.keyword || "").trim();
const scenes = storyboard.map((scene, index) => {
  const isLast = index === storyboard.length - 1;
  const visual = String(scene.visualDirection || "").trim();
  const spoken = String(scene.voiceoverLine || "").trim();
  const onScreen = String(scene.onScreenText || "").trim();
  return {
    kicker: isLast && keyword ? "CTA" : `ESCENA ${scene.sceneNumber || index + 1}`,
    headline: isLast && keyword ? `Comentá ${keyword}` : (onScreen || visual.slice(0, 74) || "Una idea para recordar"),
    body: isLast && keyword ? (spoken || String(idea.cta || "Te envío el recurso por mensaje privado.")) : (spoken || visual),
    layout: isLast && keyword ? "cta" : index === 0 ? "center" : "left",
    durationFrames: Math.max(45, Math.round(Number(scene.durationSeconds || 5) * 30)),
  };
});
const durationInFrames = scenes.reduce((sum, scene) => sum + scene.durationFrames, 0);
const props = {
  title: String(idea.title || "Instagram Reel"),
  handle,
  accentColor: "#9b8cff",
  backgroundColor: "#10131b",
  audioSrc: "voiceover.mp3",
  durationInFrames,
  scenes,
};

const downloadUrl = `${baseUrl}/api/media/assets/${voiceAssetId}`;
const response = await fetch(downloadUrl, { headers: { authorization: `Bearer ${token}` } });
if (!response.ok) {
  console.error(`Voiceover download failed: HTTP ${response.status}`);
  process.exit(1);
}

fs.mkdirSync("public", { recursive: true });
fs.writeFileSync(path.join("public", "voiceover.mp3"), Buffer.from(await response.arrayBuffer()));
fs.mkdirSync("out", { recursive: true });
const propsPath = "out/render-props.json";
fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));

const render = spawnSync("npx", [
  "remotion", "render", "src/video/index.ts", "DailyReel", "out/reel.mp4",
  `--props=${propsPath}`, "--concurrency=1",
], { stdio: "inherit", shell: process.platform === "win32" });
if (render.status !== 0) {
  console.error("Reel render failed.");
  process.exit(render.status ?? 1);
}

const still = spawnSync("npx", [
  "remotion", "still", "src/video/index.ts", "DailyReel", "out/cover.jpg",
  "--frame=0", `--props=${propsPath}`,
], { stdio: "inherit", shell: process.platform === "win32" });
if (still.status !== 0) {
  console.error("Cover render failed.");
  process.exit(still.status ?? 1);
}

async function storeAsset(assetType, filePath, mimeType, metadata) {
  const bytes = fs.readFileSync(filePath);
  const rows = await sql`INSERT INTO media_assets (content_idea_id, asset_type, storage_url, metadata) VALUES (${contentIdeaId}, ${assetType}, 'pending', ${JSON.stringify(metadata)}::jsonb) RETURNING id`;
  const id = String(rows[0].id);
  const fileName = path.basename(filePath);
  await sql`INSERT INTO media_asset_blobs (asset_id, mime_type, file_name, content_base64) VALUES (${id}, ${mimeType}, ${fileName}, ${bytes.toString("base64")})`;
  const url = `${baseUrl}/api/media/assets/${id}`;
  await sql`UPDATE media_assets SET storage_url = ${url} WHERE id = ${id}`;
  return { id, type: assetType, url, bytes: bytes.byteLength };
}

const metadata = {
  renderer: "remotion-local",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames,
  sceneCount: scenes.length,
};
const videoAsset = await storeAsset("video", "out/reel.mp4", "video/mp4", metadata);
const coverAsset = await storeAsset("cover", "out/cover.jpg", "image/jpeg", metadata);

console.log(JSON.stringify({
  rendered: true,
  contentIdeaId,
  video: videoAsset,
  cover: coverAsset,
  output: "out/reel.mp4",
}, null, 2));

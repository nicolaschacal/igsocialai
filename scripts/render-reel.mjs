import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

const voiceAssetId = process.argv[2];
const contentIdeaId = process.argv[3] || null;
const rawBaseUrl = process.env.IGSOCIALAI_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
const token = process.env.MCP_ACCESS_TOKEN;

if (!voiceAssetId) {
  console.error("Usage: npm run render:reel -- <voiceover-asset-id> [content-idea-id]");
  process.exit(1);
}
if (!baseUrl || !token) {
  console.error("Set IGSOCIALAI_URL and MCP_ACCESS_TOKEN in .env.local first.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL in .env.local so the rendered video and cover can be attached to the content idea.");
  process.exit(1);
}
if (!fs.existsSync("public/reel-props.json")) {
  console.error("Copy public/reel-props.example.json to public/reel-props.json and edit your scenes first.");
  process.exit(1);
}
if (contentIdeaId && !/^[0-9a-f-]{36}$/i.test(contentIdeaId)) {
  console.error("The content idea ID must be a valid UUID.");
  process.exit(1);
}

const downloadUrl = `${baseUrl}/api/media/assets/${voiceAssetId}`;
const response = await fetch(downloadUrl, { headers: { authorization: `Bearer ${token}` } });
if (!response.ok) {
  console.error(`Voiceover download failed: HTTP ${response.status}`);
  process.exit(1);
}

fs.mkdirSync("public", { recursive: true });
fs.writeFileSync(path.join("public", "voiceover.mp3"), Buffer.from(await response.arrayBuffer()));
fs.mkdirSync("out", { recursive: true });

const props = JSON.parse(fs.readFileSync("public/reel-props.json", "utf8"));
props.audioSrc = "voiceover.mp3";
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

const sql = neon(process.env.DATABASE_URL);
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
  durationInFrames: props.durationInFrames,
  sceneCount: Array.isArray(props.scenes) ? props.scenes.length : 0,
};
const videoAsset = await storeAsset("video", "out/reel.mp4", "video/mp4", metadata);
const coverAsset = await storeAsset("cover", "out/cover.jpg", "image/jpeg", metadata);

console.log(JSON.stringify({
  rendered: true,
  video: videoAsset,
  cover: coverAsset,
  contentIdeaId,
  output: "out/reel.mp4",
}, null, 2));

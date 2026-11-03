import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const assetId = process.argv[2];
const baseUrl = (process.env.IGSOCIALAI_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
const token = process.env.MCP_ACCESS_TOKEN;

if (!assetId) {
  console.error("Usage: npm run render:reel -- <voiceover-asset-id>");
  process.exit(1);
}
if (!baseUrl || !token) {
  console.error("Set IGSOCIALAI_URL and MCP_ACCESS_TOKEN in .env.local first.");
  process.exit(1);
}
if (!fs.existsSync("public/reel-props.json")) {
  console.error("Copy public/reel-props.example.json to public/reel-props.json and edit your scenes first.");
  process.exit(1);
}

const downloadUrl = `${baseUrl}/api/media/assets/${assetId}`;
const response = await fetch(downloadUrl, { headers: { authorization: `Bearer ${token}` } });
if (!response.ok) {
  console.error(`Voiceover download failed: HTTP ${response.status}`);
  process.exit(1);
}

fs.mkdirSync("public", { recursive: true });
fs.writeFileSync(path.join("public", "voiceover.mp3"), Buffer.from(await response.arrayBuffer()));
fs.mkdirSync("out", { recursive: true });

const render = spawnSync("npx", [
  "remotion", "render", "src/video/index.ts", "DailyReel", "out/reel.mp4",
  "--props=public/reel-props.json",
], { stdio: "inherit", shell: process.platform === "win32" });

process.exit(render.status ?? 1);

import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required in .env.local.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
let busy = false;

async function processNextJob() {
  if (busy) return;
  busy = true;
  try {
    const jobs = await sql`UPDATE render_jobs
      SET status = 'running', started_at = NOW(), updated_at = NOW()
      WHERE id = (
        SELECT id FROM render_jobs
        WHERE status = 'queued'
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING id, content_idea_id, voiceover_asset_id, started_at`;

    if (!jobs.length) return;
    const job = jobs[0];
    console.log(`[render-worker] Starting job ${job.id}`);

    const run = spawnSync(process.execPath, [
      "scripts/render-reel.mjs",
      String(job.voiceover_asset_id),
      String(job.content_idea_id),
    ], {
      encoding: "utf8",
      stdio: "pipe",
      shell: process.platform === "win32",
    });

    if (run.status !== 0) {
      const errorText = [run.stderr, run.stdout].filter(Boolean).join("\n").slice(-4000);
      await sql`UPDATE render_jobs SET status = 'failed', error_message = ${errorText || "Local render failed."}, finished_at = NOW(), updated_at = NOW() WHERE id = ${job.id}`;
      console.error(`[render-worker] Job ${job.id} failed`, errorText);
      return;
    }

    const assets = await sql`SELECT id, asset_type FROM media_assets WHERE content_idea_id = ${job.content_idea_id} AND created_at >= ${job.started_at} AND asset_type IN ('video', 'cover') ORDER BY created_at DESC`;
    const video = assets.find((asset) => asset.asset_type === "video");
    const cover = assets.find((asset) => asset.asset_type === "cover");
    if (!video || !cover) {
      await sql`UPDATE render_jobs SET status = 'failed', error_message = 'Renderer completed but video/cover assets were not saved.', finished_at = NOW(), updated_at = NOW() WHERE id = ${job.id}`;
      return;
    }

    await sql`UPDATE render_jobs SET status = 'completed', video_asset_id = ${video.id}, cover_asset_id = ${cover.id}, finished_at = NOW(), updated_at = NOW() WHERE id = ${job.id}`;
    console.log(`[render-worker] Job ${job.id} completed. Video=${video.id}, cover=${cover.id}`);
  } catch (error) {
    console.error("[render-worker] Unexpected error", error);
  } finally {
    busy = false;
  }
}

console.log("[render-worker] Online. Polling Neon for queued Reel renders every 15 seconds.");
await processNextJob();
setInterval(processNextJob, 15_000);

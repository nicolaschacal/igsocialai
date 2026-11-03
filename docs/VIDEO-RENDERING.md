# Local motion-graphics renderer

The first renderer is a local Remotion composition. Claude queues a render through MCP; a small worker on the creator's PC executes it. This avoids a paid cloud-rendering service.

## One-time setup on Windows

1. Install Node.js 22 LTS.
2. Clone the repository and run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `DATABASE_URL`, `MCP_ACCESS_TOKEN`, `IGSOCIALAI_URL=https://igsocialai.vercel.app`, and `NEXT_PUBLIC_APP_URL=https://igsocialai.vercel.app`.
5. Start the local worker with `npm run worker:render`.

The worker polls Neon every 15 seconds. When Claude queues a render job, it downloads the voiceover, reads the saved storyboard from Neon, creates a Remotion scene manifest, renders the Reel and JPEG cover, and uploads both assets back to Neon.

## Keep the worker running

For unattended rendering, use Windows Task Scheduler:
- Trigger: At log on.
- Action: Start program `npm.cmd`.
- Arguments: `run worker:render`.
- Start in: the local `igsocialai` repository folder.
- Enable restart on failure.

The PC must be powered on and awake for rendering. If it is off, jobs remain queued and run when the worker starts again. The worker renders one video at a time to limit memory use.

## Output

- `out/reel.mp4`: 1080x1920 vertical Reel, 30fps.
- `out/cover.jpg`: JPEG cover.
- Both files are also stored as media assets in Neon and attached to the content idea.

The composition uses typography, animated scene transitions, progress, narration, and a keyword CTA. The scene durations come from Claude's saved storyboard. More sophisticated templates can be added without changing the approval and publishing flow.

## Hardware and cost

Start with one render at a time and 1080x1920 at 30fps. This is intended for a modest local PC. No paid cloud renderer is required. Remotion's free license covers individuals and organizations of up to three people, including commercial use and automation, subject to its license terms. Re-check licensing if the project grows beyond that eligibility.

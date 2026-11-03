# Local motion-graphics renderer

The first renderer is a local Remotion composition, so video rendering does not consume a paid cloud-rendering service. The initial design is deliberately template-driven: text animation, typography, scene transitions, progress, audio narration, and a keyword CTA.

## Setup on Windows

1. Install Node.js 22 LTS.
2. Clone the repository and run `npm install`.
3. Copy `public/reel-props.example.json` to `public/reel-props.json`.
4. Put the generated narration file at `public/voiceover.mp3`.
5. Edit the scene data in `public/reel-props.json`.
6. Run `npm run studio` to preview the composition.
7. Run `npm run render:reel -- VOICEOVER_ASSET_ID CONTENT_ID` to render `out/reel.mp4` and `out/cover.png`, then upload both assets to Neon.

The current command and composition are a first template scaffold. A later production worker will take a storyboard JSON and generated voiceover, calculate scene durations, create subtitles and covers, and call the local renderer without requiring manual editing.

## Hardware

Start with 1080x1920, 30fps, H.264 output and modest motion. The user's 8 GB RAM PC should be tested with one render at a time. If Chromium rendering is memory-heavy, reduce concurrency and render resolution during previews.

## Licensing

Remotion's current free license covers individuals and organizations of up to three people, including commercial use and automation, subject to its license terms. Re-check licensing if the project grows beyond that eligibility or if end users are given access to the Remotion project/code.

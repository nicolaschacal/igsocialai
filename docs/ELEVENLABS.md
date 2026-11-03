# ElevenLabs voice generation

The MCP tool `elevenlabs_generate_voiceover` creates an MP3 from a script using the configured ElevenLabs voice, then stores the generated audio in the Neon media store. It returns a media asset ID and a protected download URL.

Required environment variables:
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- Optional: `ELEVENLABS_MODEL_ID` (defaults to `eleven_multilingual_v2`)

Generated audio is stored as base64 in a separate Postgres table for the early single-creator prototype. This is intentionally simple but not the long-term storage design for a multi-tenant SaaS; move to object storage before storing many large media files.

## Render locally on Windows

1. Copy `.env.example` to `.env.local`.
2. Set `IGSOCIALAI_URL=https://igsocialai.vercel.app` and `MCP_ACCESS_TOKEN`.
3. Copy `public/reel-props.example.json` to `public/reel-props.json` and edit the scenes.
4. In Claude, generate the voiceover using `elevenlabs_generate_voiceover`.
5. Copy the returned asset ID.
6. Run `npm run render:reel -- ASSET_ID`.

The script downloads the audio from the protected app endpoint and runs Remotion locally, producing `out/reel.mp4`. The computer must have Node.js 22 and dependencies installed. This keeps video rendering off Vercel and avoids a paid cloud renderer.

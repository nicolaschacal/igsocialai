# Daily experience — Claude-first product

The primary product surface is Claude, not a conventional social-media dashboard.

## 07:00 daily loop
1. Claude starts the morning briefing when the user opens Claude or invokes the daily workflow. An unattended 07:00 push/report requires a durable scheduler and a notification channel; an MCP server alone cannot wake Claude.
2. Fetch account profile, recent media, comments, available insights and historical snapshots through official Meta APIs.
3. Compare performance with prior periods and identify meaningful audience behavior changes.
4. Research niche trends separately from first-party account analytics. Label facts, estimates and hypotheses.
5. Present exactly three content concepts with hook, audience, format, CTA, rationale and motion-graphics approach.
6. Save the ideas and wait for the user's selection.

## Production after selection
1. Write a complete voiceover script and scene-by-scene storyboard.
2. Generate narration with the user's configured ElevenLabs voice.
3. Render a template-driven vertical video (9:16), subtitles, transitions, sound design and safe margins.
4. Create a matching cover and caption.
5. Show preview, transcript, caption, cover, CTA keyword, resource to deliver, and proposed publishing time.
6. Wait for explicit approval of that exact version.
7. Publish through the official Instagram API and verify the returned media ID/status.

## Community loop
- Receive comment and messaging events through Meta webhooks.
- Match exact keyword rules to the Reel/post that owns the keyword.
- Send the supported private reply only within Meta's API constraints and messaging window.
- Deliver the resource only after the requested follow condition is verified through a supported official API capability. If follower verification is unavailable for that account/app/permission, tell the user honestly and use a fallback such as a follow link plus manual/alternative verification. Never pretend to verify a follow.
- Answer routine questions only from the creator's approved knowledge and response policies.
- Escalate sensitive, ambiguous, refund, complaint, or high-risk conversations to the creator.
- Keep an audit trail and rate limits; never spam users.

## Scheduling reality
MCP is a tool connection, not a background scheduler. Claude generally acts when the user invokes it or a host triggers it. To deliver a true unattended 07:00 report, add a scheduler that runs on the server and a notification surface. That scheduler can collect data and prepare a report; it cannot use the user's Claude subscription as an unattended server-side model API.

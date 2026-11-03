# Daily experience — Claude-first product

The primary product surface is Claude Cowork, not a conventional social-media dashboard. The first version uses Claude's own scheduled tasks as the daily orchestrator, so the app does not need to host a second LLM or maintain its own cron-driven AI agent.

## 07:00 daily loop
1. Create a Claude Cowork scheduled task for every day at 07:00 in `America/Montevideo`. Scheduled tasks can run remotely and use connected tools, even when the user's computer is asleep.
2. The task calls `instagram_workspace_status` and `instagram_morning_data` through this remote MCP connector.
3. Claude summarizes account profile and recent owned media. It must label measured account data separately from external niche research, hypotheses, and recommendations.
4. Claude compares with prior daily reports when historical data is available. The first version must not invent reach, saves, shares, demographics or engagement metrics that Meta did not return.
5. Claude presents exactly three content concepts with hook, audience, format, CTA, rationale, and scene-by-scene motion-graphics direction.
6. Claude saves the three concepts with `content_idea_save` and waits for the user's selection.

## Production after selection
1. Write a complete voiceover script and storyboard.
2. Generate narration with the user's configured ElevenLabs voice.
3. Render a template-driven vertical video (9:16), subtitles, transitions, sound design and safe margins using the Remotion composition.
4. Create a matching cover and caption.
5. Show preview, transcript, caption, cover, CTA keyword, resource to deliver, and proposed publishing time.
6. Wait for explicit approval of that exact version.
7. Publish through the official Instagram API and verify the returned media ID/status.

## Community loop
- Receive comment and messaging events through Meta webhooks.
- Match exact keyword rules to the Reel/post that owns the keyword.
- Send the supported private reply only within Meta's API constraints and messaging window.
- For a keyword comment, send the one permitted private reply with a clear prompt and a quick-reply action such as “Ya seguí”. After the person taps/replies and creates a messaging context, use the Instagram Messaging User Profile API field `is_user_follow_business` (requires Instagram Login, `instagram_business_manage_messages`, and the person's IGSID) to verify the follow. If false, ask them to follow and tap again; if true, deliver the resource within the active messaging window. Never attempt to look up arbitrary usernames or enumerate followers.
- Answer routine questions only from the creator's approved knowledge and response policies.
- Escalate sensitive, ambiguous, refund, complaint, or high-risk conversations to the creator.
- Keep an audit trail and rate limits; never spam users.

## Scheduling boundary
The remote MCP server exposes tools; it does not wake Claude by itself. Claude Cowork scheduled tasks provide the 07:00 trigger and can invoke connected tools remotely. This avoids a separate server-side model API for the first version, but consumes the user's Claude plan usage and is subject to Anthropic's scheduled-task availability and usage limits.

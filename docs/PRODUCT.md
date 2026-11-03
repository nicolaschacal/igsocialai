# Product definition — IG Social AI

## North star
A creator approves the strategy and every public-facing action from Claude. The app handles durable execution: generating assets, preparing posts, scheduling approved work, processing Meta webhooks, and reporting outcomes.

## Primary daily loop
1. Fetch authorized Instagram account profile, recent media, and available insights.
2. Analyze the creator's niche and performance using only accessible account data plus clearly labeled public research.
3. Propose a small, prioritized set of Reel/story/carousel concepts with audience, hook, CTA, and rationale.
4. User selects a concept in Claude.
5. Prepare script, scene-by-scene motion-graphics storyboard, caption, cover concept, and keyword/CTA strategy.
6. Generate voiceover through ElevenLabs only after the user configures a voice and accepts the provider's usage costs/limits.
7. Render a draft video using reusable Remotion templates and FFmpeg.
8. Present a review package to Claude: preview, caption, cover, scheduled time, and automation rules.
9. Publish only after an explicit approval bound to that exact content version.
10. Process comments/DMs using approved rules, respect Meta messaging windows, log actions, and escalate uncertain or sensitive conversations.
11. Produce a morning report and prepare the next plan.

## Approval model
- Research, analysis, ideation, and draft creation: may run automatically within user-configured limits.
- Public publishing, sending first-contact DMs, changing automation rules, deleting content, and replying outside approved templates: require explicit approval.
- The user can create narrowly scoped standing policies (e.g. reply to FAQs with approved answers) and revoke them.
- Approval must be versioned: changing media, caption, CTA, destination, or time invalidates the previous approval.

## Initial MVP scope
- Single Instagram professional account owned/controlled by the developer.
- Account connection via official Meta OAuth.
- Profile/media/insights read where permissions allow.
- Niche audit and content idea/brief generation via Claude conversation tools.
- Content drafts and approval queue.
- Template-based motion graphics renderer.
- ElevenLabs voice generation behind an optional integration.
- Instagram publishing of supported media types after approval.
- Webhook ingestion for comments and messaging only after Meta grants required permissions.

## Explicitly deferred
- Multi-tenant SaaS billing and agency workspaces.
- Automated competitor intelligence beyond public/authorized information.
- Fully autonomous DM sales agent.
- Arbitrary AI-generated video scenes.
- Cross-platform publishing.

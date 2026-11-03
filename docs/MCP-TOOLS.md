# Proposed Claude MCP tools

Tools are grouped by risk. Execution tools must validate account ownership, user permissions, policy scope, content version, and approval state server-side.

## Read / analyze (no external side effects)
- instagram_workspace_status
- instagram_morning_data
- instagram_get_account
- instagram_list_media
- instagram_get_insights
- instagram_get_comments
- instagram_list_conversations
- creator_get_profile
- creator_audit_niche
- creator_analyze_performance

## Create drafts (internal side effects only)
- content_propose_ideas
- content_create_script
- content_create_storyboard
- content_create_caption
- content_create_cover_brief
- media_generate_voiceover
- elevenlabs_generate_voiceover
- media_render_video
- content_create_review_package

## Approval workflow
- approvals_list_pending
- approvals_get_details
- approvals_approve_version
- approvals_request_revision
- approvals_reject_version

## Execute approved actions
- instagram_publish_approved
- instagram_schedule_approved
- instagram_reply_to_comment_under_policy
- instagram_send_private_reply_under_policy
- instagram_reply_to_dm_under_policy

## Policy management
- automation_list_rules
- automation_create_rule
- automation_pause_rule
- automation_update_rule

## Approval contract
An approval record must bind to:
- Instagram account ID
- exact content version ID and content hash
- media asset IDs and hashes
- caption and cover version
- target destination and publish time
- action type

Any change to these fields requires a new approval.

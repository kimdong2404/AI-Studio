<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Characters and their reference images live in Lovable Cloud (tables characters, character_images; private bucket character-images, read via signed URLs); other asset types still use localStorage — V2 requirement: real image storage, no base64, for characters.
- No user accounts yet: character tables/bucket are open to anonymous users by design (spec says no auth in V2).
- Scenes persist in Lovable Cloud (scenes + scene_characters/scene_ingredients/scene_props link tables, scenes.location_id); scenes store only asset IDs — why: asset edits/Master changes must flow into storyboard. All 4 asset libraries use createRemoteAssets.
- Character Sheet: character_sheets (1 per character), character_expressions + character_expression_images (bucket prefix expressions/); scene_characters.expression_id stores the scene's chosen expression per character — why: expressions belong to a character, scenes reference by ID only.
- Prompt Builder builds prompts on the fly from scene + library data by ID; user edits are stored as append-only versions (prompt_versions; latest row decides shown prompt, auto_generated row = back to auto; unsaved drafts in localStorage prompt_builder_draft_{scene_id}; textarea only reset on scene open or explicit user action; scene_prompts is legacy) — why: never copy asset data into scenes.
- AI image generation goes through the provider-agnostic generateImage() in src/lib/imageGeneration.ts; providers/models come only from ai_providers/ai_models config tables (no hard-coded provider, no keys in frontend) — why: swap providers without touching UI.

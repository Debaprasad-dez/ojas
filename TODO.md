# TODO

## Done

- [x] **Hugging Face calls behind a backend.** The token lives server-side as `HF_TOKEN` (sensitive, Production) in the **`proxy`** Vercel project (debaprasad account). Its function `api/hf-chat.ts` (source: `Desktop/Lifeverse/proxy`):
  - calls Hugging Face with the pinned provider and allows only the three menu models;
  - caps answers at 2048 tokens and history at 16 messages;
  - rate-limits each IP to 30 requests per 10 minutes;
  - accepts browser requests from GitHub Pages, localhost and `*.vercel.app`.

  It's live at `https://proxy-xi-pied.vercel.app/api/hf-chat`. `npm run check:proxy` checks it without spending credits.
- [x] **Hosting.** The site is on GitHub Pages at `https://debaprasad-dez.github.io/ojas/`. Every push to `main` deploys it.

## Open

- [ ] **Commit the proxy changes in the LifeVerse repo:** `proxy/api/hf-chat.ts`, `proxy/vercel.json` and the README change. They're deployed but uncommitted.
- [ ] **Delete `VITE_HF_TOKEN` from `.env.local`.** Nothing reads it any more. It was kept only because the Vercel copy is sensitive and can't be read back.
- [ ] Optional: set a monthly spend limit on the Hugging Face account. The rate limit counts per server instance, so it's a brake, not a cap.

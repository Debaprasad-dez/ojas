# TODO

## Done

- [x] **Hugging Face calls behind a backend.** The token lives server-side as `HF_TOKEN` (sensitive, Production) in the **`proxy`** Vercel project (debaprasad account), which serves `https://proxy-xi-pied.vercel.app/api/hf-chat`. The function's source is `proxy/hf-chat.ts` in this repo (deploy steps: `proxy/README.md`). It:
  - calls Hugging Face with the pinned provider and allows only the three menu models;
  - caps answers at 2048 tokens and history at 16 messages;
  - rate-limits each IP to 30 requests per 10 minutes;
  - accepts browser requests only from the GitHub Pages site and localhost.

  `npm run test:proxy` (Hugging Face stubbed) and `npm run check:proxy` (live) both run without spending credits.
- [x] **Hosting.** The site is on GitHub Pages at `https://debaprasad-dez.github.io/ojas/`. Every push to `main` deploys it.

## Open

- [ ] **Delete `VITE_HF_TOKEN` from `.env.local`.** Nothing reads it any more. It was kept only because the Vercel copy is sensitive and can't be read back.
- [ ] Optional: set a monthly spend limit on the Hugging Face account. The rate limit counts per server instance, so it's a brake, not a cap.

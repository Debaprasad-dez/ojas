# Ojas One chat proxy

`hf-chat.ts` is the Vercel Function that answers Ojas One's chats. It holds the Hugging Face token (`HF_TOKEN`), so the token never reaches the browser.

It is served from the **`proxy`** Vercel project (debaprasad account) at
`https://proxy-xi-pied.vercel.app/api/hf-chat`.

That project also serves LifeVerse's own `api/chat.ts`. The two only share the hosting:
- Each is a separate file with its own settings.
- This function reads only `HF_TOKEN`.
- It accepts browser calls only from Ojas One's origins.

## Deploy

A Vercel deployment is one snapshot of a whole folder, so this file is deployed together with LifeVerse's function from the `proxy` project's folder. That folder is `Lifeverse/proxy`, where the copy of this file is git-ignored locally.

1. Copy `hf-chat.ts` to `<proxy project folder>/api/hf-chat.ts`.
2. In that folder, run `vercel --prod`, logged in as the debaprasad account.

Redeploying LifeVerse from that folder also redeploys this function, as long as the copy is still there.

## Check

- `npm run test:proxy`: unit check with Hugging Face stubbed. It spends no credits.
- `npm run check:proxy`: live check of CORS and refusals. It spends no credits.

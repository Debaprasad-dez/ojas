# Ojas One

A chat app for learning about anything. Answers can include charts, tables, flowcharts, callouts and code.

**Live:** https://debaprasad-dez.github.io/ojas/

## How it works

- React + Vite single-page app, hosted on GitHub Pages.
- Answers come from Hugging Face models (Llama 3.1 8B, Gemma 3 4B / 12B on deepinfra) through a small Vercel function, so the Hugging Face token never reaches the browser. Its source is [`proxy/hf-chat.ts`](proxy/), and the `proxy` Vercel project serves it. It allows only these three models, caps answer length and history, rate-limits each IP, and accepts browser calls only from this site.
- Chats, profile and today's topics are kept in the browser's localStorage (up to 10 chats).
- Rich blocks: Highcharts (charts), AG Grid Community (tables), Mermaid (flowcharts).

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run lint
npm run build        # output in dist/, served under /ojas/
```

Optional `.env.local` (see `.env.example`): `VITE_CHAT_URL` points the app at another chat endpoint, and `VITE_HF_MODEL` picks the default model.

In dev, sending `/demo` shows a sample reply with every block type, without calling the model.

## Checks

- `npm run test:proxy`: unit check of the chat function, with Hugging Face stubbed. It spends no credits.
- `npm run check:proxy`: live check of the chat endpoint's CORS and refusals. It spends no credits.
- `npm run eval:leaks`: sends ~24 prompts and flags replies that leak internals. It spends real credits (about $0.001 per run).

## Deploy

Every push to `main` builds and publishes to GitHub Pages (`.github/workflows/deploy.yml`).

# DWHF proxy worker

Holds the Claude API key server-side and fetches recipe URLs (replaces
corsproxy.io and the in-app API-key field).

## One-time setup

```sh
cd worker
npx wrangler login                          # opens browser to authorize
npx wrangler deploy                         # prints your workers.dev URL
npx wrangler secret put ANTHROPIC_API_KEY   # paste a FRESH key from console.anthropic.com
```

Then paste the printed URL into `WORKER_URL` near the top of the script in
`../index.html` (no trailing slash).

## After it works

- Delete the old key from Firestore (`config/app` document) and revoke it at
  console.anthropic.com — it was readable by anyone while stored there.
- Optionally set `ALLOWED_ORIGINS` in `wrangler.toml` to the exact origin the
  app is hosted on, then `npx wrangler deploy` again.

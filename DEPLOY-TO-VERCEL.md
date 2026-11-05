# Final Vercel deployment

This is the adjusted app from the user's specified v1.2 folder. It has not been deployed to Vercel in this session. The current working name remains LAURA Food Donation until Dr. Rana provides its replacement.

1. Apply the approved name and UI wording after review.
2. Link/import this project in the intended Vercel account. Use **Other** as the framework preset, `npm run build` as the build command and `dist` as the output directory. The project uses its supplied prebuilt bundles; it does not have the missing original Vite/JSX source.
3. Configure a shared Upstash-compatible Redis store with these **server-side** environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` are supported alternatives. Never prefix these secrets with `VITE_` or put them in the client bundle.
4. Deploy the complete project, including `app-source/`, `scripts/`, `api/`, `server/`, `package.json`, `package-lock.json` and `vercel.json`. Uploading only `dist/` does not deploy the visitor API.
5. Confirm that the visitor card shows a number, refreshing the same browser leaves it unchanged, and a new browser increments it once. Then share the verified final URL.

The counter estimates distinct anonymous browsers since counting begins. It counts visitors, not donations, and never seeds the total from saved donation records. An HTTP-only random cookie deduplicates refreshes. Clearing cookies or using a different browser may count again. The production deduplication keys/cookies expire after one year. No names, emails, IP addresses, locations or donation details are collected by this counter.

The Redis operation deduplicates and increments atomically. If the shared store is unavailable or not configured, the API returns HTTP 503 and the UI displays an em dash instead of an invented count.

For local use, the Windows launcher and Node preview server maintain a separate local count in `.local/visitors.json`, outside the served assets. Local test counts are excluded from the release package.

References: [Vercel functions](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration), [environment variables](https://vercel.com/docs/environment-variables), [Upstash REST API](https://upstash.com/docs/redis/features/restapi).

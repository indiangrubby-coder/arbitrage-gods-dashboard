# Deploying Arbitrage Gods to Vercel — Step-by-step (Non-technical)

This document explains the minimal steps to get your app live on Vercel. I'll summarize everything we already prepared and give exact copy-paste commands for Vercel Dashboard.

1) Prepare the repository:
   - Commit and push all changes to your main branch.
   - Make sure `.env.local` is not committed (secrets) and `.env.example` has placeholders.

2) Create Vercel project (one-time):
   - Sign in to https://vercel.com
   - Click "New Project" → Import your GitHub repository
   - Accept all defaults (Vercel will detect Next.js)

3) Add environment variables in Vercel project settings:
   - Production & Preview (both):
     - NEXT_PUBLIC_SUPABASE_URL = https://kxbxqmimnxyteuxeiooi.supabase.co
     - NEXT_PUBLIC_SUPABASE_ANON_KEY = (Pub key from Supabase) — **paste the anon key**
     - SUPABASE_SERVICE_KEY = (Service role) — mark as secret
     - NEXTAUTH_URL = https://YOUR_PRODUCTION_DOMAIN (or your Vercel preview URL for preview env)
     - NEXTAUTH_SECRET = (A long random string) — mark as secret

   - Use Vercel Dashboard → Settings → Environment Variables → Add key/value

4) Domain & SSL (Vercel will provide HTTPS automatically):
   - In Vercel Dashboard → Domains → Add domain (eg: dashboard.my-domain.com)
   - Follow the DNS instructions for your registrar (e.g., Cloudflare, GoDaddy)
   - Vercel will provision SSL certificate automatically

5) Supabase configuration (so auth works):
   - Go to Supabase → Authentication → Settings:
     - Add your domain to "Site URL" and to "Allowed Redirect URLs"
     - Eg: https://dashboard.my-domain.com and https://YOUR_VERCEL_URL

6) Deploy and test:
   - Push your changes to GitHub (main branch) — Vercel automatically builds
   - Visit the Vercel deployment URL (or your custom domain) and check the login
   - Use credentials: `snafu / random@123`

7) Troubleshooting:
   - If the dashboard fails to load: check Vercel build logs (click Deployment → Logs)
   - Missing environment variable: Vercel logs will show missing key errors
   - Supabase auth redirect: make sure `NEXTAUTH_URL` and redirect URLs match exactly

8) Post-deploy (optional recommendations):
   - Enable automatic deploys from the main branch in Vercel
   - Add a basic monitoring (Sentry or Vercel analytics)

If you want, I can:
- Commit the `VERCEL-DEPLOY.md` for you and push the changes, then give the exact Vercel env variables to paste.
- Execute the Git and Vercel steps for you if you share access (GitHub and Vercel credentials) — otherwise I'll guide you through it step-by-step on your screen.

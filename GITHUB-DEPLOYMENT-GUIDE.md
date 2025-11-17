# GitHub & Vercel Deployment Guide

Your project is ready to deploy! Follow these steps to get your Arbitrage Gods dashboard live.

---

## Step 1: Create GitHub Repository

1. Go to **https://github.com/new**
2. Enter repository name: `arbitrage-gods-dashboard` (or your preferred name)
3. Set to **Private** (recommended for security)
4. Click **Create repository**

---

## Step 2: Push Code to GitHub

After creating the repo, run these commands in PowerShell:

```powershell
cd "d:\VS WORK\arbitrage gods - roocode + claude"

git remote add origin https://github.com/YOUR_USERNAME/arbitrage-gods-dashboard.git
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username.**

---

## Step 3: Create Vercel Project

1. Go to **https://vercel.com/new**
2. Click "Import Git Repository"
3. Paste your GitHub repo URL: `https://github.com/YOUR_USERNAME/arbitrage-gods-dashboard`
4. Click Import
5. Vercel will auto-detect Next.js — accept defaults
6. Click "Deploy"

---

## Step 4: Add Environment Variables in Vercel

After deployment starts, go to **Project Settings → Environment Variables** and add:

| Variable Name | Value | Type |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kxbxqmimnxyteuxeiooi.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [Paste your Supabase anon key] | Public |
| `SUPABASE_SERVICE_KEY` | [Paste your Supabase service role key] | Secret |
| `NEXTAUTH_URL` | `https://YOUR_DOMAIN.com` | Public |
| `NEXTAUTH_SECRET` | [Generate with: openssl rand -base64 32] | Secret |
| `SIMULATION_MODE` | `true` | Public |

**To get Supabase keys:**
- Go to your Supabase project
- Settings → API → Copy "Project URL" (for `NEXT_PUBLIC_SUPABASE_URL`)
- Copy "anon public" key (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Copy "service_role" key (for `SUPABASE_SERVICE_KEY`)

---

## Step 5: Update Supabase Redirect URLs

In your Supabase project:

1. Go to **Authentication → Settings**
2. Find "Site URL" and set to: `https://yourdomain.com` (or Vercel preview URL)
3. Find "Allowed Redirect URLs" and add:
   - `https://yourdomain.com`
   - `https://YOUR_PROJECT.vercel.app`
4. Save changes

---

## Step 6: Add Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings → Domains**
2. Add your domain (e.g., `dashboard.my-company.com`)
3. Vercel will show DNS records to add with your registrar (GoDaddy, Cloudflare, etc.)
4. Follow the DNS instructions from your registrar
5. Wait for DNS propagation (usually 5-30 minutes)

---

## Step 7: Test Your Deployment

Once deployed, visit your Vercel URL or custom domain:

- **Homepage:** https://yourdomain.com/
- **Login page:** https://yourdomain.com/login
- **Health check:** https://yourdomain.com/api/health

**Test login:**
- Username: `snafu`
- Password: `random@123`

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Build fails | Check Vercel logs (Deployments → click failed deploy) |
| Login doesn't work | Verify NEXTAUTH_URL matches your domain exactly |
| Dashboard shows no accounts | Ensure SIMULATION_MODE=true or check Supabase connection |
| 404 errors on API routes | Check that all env vars are set correctly in Vercel |

---

## Post-Deployment

1. **Run database setup** (if using production data):
   - Open Supabase SQL editor
   - Copy content from `database/setup.sql`
   - Paste and run in Supabase

2. **Set production credentials** (if not using simulation mode):
   - Set SIMULATION_MODE to `false`
   - Add Facebook API credentials if fetching real data

3. **Enable monitoring** (optional):
   - Enable Vercel Analytics
   - Set up Supabase monitoring

---

## Questions?

Refer to `VERCEL-DEPLOY.md` for non-technical overview.
Check `IMPLEMENTATION-COMPLETE.md` for app architecture details.

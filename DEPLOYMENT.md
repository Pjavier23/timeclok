# TimeClok Deployment Guide

## Step 1: Create GitHub Repository (2 minutes)

1. Go to https://github.com/new
2. Create repo named `timeclok`
3. Make it **Public**
4. Click "Create repository"

## Step 2: Push Code to GitHub (1 minute)

```bash
cd /root/.openclaw/workspace/timeclok
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/Pjavier23/timeclok.git
git branch -M main
git push -u origin main
```

You'll be prompted for GitHub credentials - use your GitHub personal access token or SSH key.

## Step 3: Set Up Supabase (5 minutes)

1. Go to https://supabase.com
2. Sign up (free tier is perfect)
3. Create new project:
   - Name: `timeclok`
   - Region: Choose closest to you
   - Password: Generate strong one
4. Wait for it to initialize (~2 min)

### 3a. Create Database Tables

1. Click "SQL Editor" in left sidebar
2. Click "New Query"
3. Copy entire contents of `schema.sql` from this repo
4. Paste into SQL Editor
5. Click "Run" (▶️)
6. Wait for success

### 3b. Get Your API Keys

1. Go to **Settings** → **API**
2. Copy `Project URL` (this is `NEXT_PUBLIC_SUPABASE_URL`)
3. Copy `anon public` key (this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. **Save these** - you'll need them in next step

## Step 4: Deploy to Vercel (3 minutes)

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Search & select `timeclok` from GitHub
4. **Environment Variables:**
   - Click "Environment Variables"
   - Add two variables:
     - Name: `NEXT_PUBLIC_SUPABASE_URL`
     - Value: (paste your Supabase Project URL)
     - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - Value: (paste your Supabase anon key)
5. Click "Deploy"
6. Wait 3-5 minutes for build

## Step 5: Test Live App

Your app will be live at: `https://timeclok-[random].vercel.app`

### Quick Test:
1. Click "Owner/Manager" on landing page
2. You should see the dashboard with mock data
3. Click "Employee/Contractor"
4. Try "Clock In" - it will ask for location permission

## What's Now Live:

✅ **Owner Dashboard:**
- Real Supabase auth (sign up/login)
- Employee list (from database)
- Time tracking data
- Payroll approval workflow
- Auto-calculated payroll

✅ **Employee Portal:**
- Clock in/out with geolocation
- Time entry history
- Earnings tracker
- Profile with stats

✅ **Database:**
- Users, employees, time entries
- Projects & assignments
- Payroll tracking
- Row-level security (privacy)

## Next Steps (Optional):

1. **Add Real Email Verification** → Supabase Auth handles this
2. **Import Real Employee Data** → Use Supabase SQL or API
3. **Set Up Stripe Payments** → For subscription billing
4. **Add Supervisor Roles** → Multi-level approval workflow
5. **Export Payroll Reports** → CSV/PDF generation
6. **Mobile App** → Use React Native / Expo

## Troubleshooting:

**"Supabase not found" error?**
- Check env variables are set in Vercel
- Redeploy after adding env vars

**Clock in/out not working?**
- Check browser allows location access
- Check Supabase time_entries table (data should appear)

**Auth failing?**
- Check email/password match database
- Check Supabase Auth section for sign-ups

---

**Total time: ~15 minutes for full production app!**

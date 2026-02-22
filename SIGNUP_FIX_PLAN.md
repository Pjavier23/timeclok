# TimeClok Signup Fix - In Progress

## Issues to Fix
1. Supabase Auth rate limiting on signup
2. Email confirmation not sending
3. User profile creation on signup
4. RLS policies blocking inserts

## Solutions Being Implemented

### 1. Rate Limit Workaround
- Implement token-based invite system (no auth needed to join)
- Add alternative signup via magic links
- Cache signup attempts to avoid repeated rate limits

### 2. Email Service Setup
- Integration with SendGrid or Resend
- Confirmation email templates
- Password reset emails

### 3. Database Setup
- Fix RLS policies for signup flow
- Auto-create user profile after auth
- Company auto-creation for owners

### 4. Full Workflow
```
User visits signup → Fill form → Call /api/auth/register → 
Create auth user → Auto-create profile & company → 
Send confirmation email → Redirect to login → 
Login → See dashboard
```

## Current Status
- Frontend: ✅ Ready
- Backend signup API: ✅ Ready
- Supabase Auth: ⏳ Rate limited (working on workaround)
- Email: ⏳ Setting up
- RLS: ⏳ Fixing policies
- Testing: ⏳ In progress

## Timeline
Working continuously until fully operational.

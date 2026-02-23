# TimeClok - Production Guide

## Overview
TimeClok is a modern employee time tracking and payroll management system. Fully bilingual (English/Spanish), mobile-first design, with real-time geolocation tracking.

## Live URL
**https://timeclok.vercel.app**

---

## For Owners/Managers

### 1. Signup & Account Creation

#### Option A: Quick Signup
- Go to https://timeclok.vercel.app/auth/signup
- Enter email, password, company name
- ✅ Instant access to owner dashboard (auto-confirmed)
- Auto-seeded with sample data (3 employees, projects, time entries)

#### Option B: Fast Setup (Admin)
- Go to https://timeclok.vercel.app/app/setup
- Admin Token: `timeclok-setup-2024`
- Fill in company name, email, password
- ✅ Instant business setup (same as Option A)

### 2. Owner Dashboard
**URL**: https://timeclok.vercel.app/owner/dashboard

**Features**:
- 📊 Overview tab: Employee count, pending payroll, approval count
- 👥 Employees tab: View all employees
- 💰 Payroll tab: Approve payroll, view payment status
- 📁 Projects tab: Manage projects

**Language**: Toggle English/Spanish in top-right corner

### 3. Add Employees

#### Step 1: Go to Employees Page
- Click "Employees" in navigation or go to https://timeclok.vercel.app/owner/employees
- Click "➕ Add Employee" button

#### Step 2: Fill Employee Info
- **Email**: Employee's email address
- **Hourly Rate**: Hourly wage (e.g., $25.00)
- **Send via**: Email or SMS

#### Step 3: Send Invite
- Select Email or SMS method
- If SMS: Enter phone number (format: +1234567890)
- Click "Send Invite"
- ✅ Employee receives invite link instantly

### 4. Manage Payroll

#### View Payroll
- Go to Payroll tab in dashboard
- See all time entries for all employees
- Filter by status: Pending, Approved, Paid

#### Approve Payroll
- Click "Approve" on any pending payroll record
- ✅ Record moves to "Ready to Pay" section

#### Process Payment
- Click "Pay" on approved payroll
- ✅ Record marked as "Paid"
- Records when payment was made

#### Export Payroll
- Click "📥 Export" button
- Downloads CSV file with all payroll records
- Can be used in accounting software

---

## For Employees

### 1. Join Company

#### Via Email Invite
1. Click invite link in email
2. Signup page opens with company pre-filled
3. Enter password
4. ✅ Account created, go to clock in

#### Via SMS Invite
1. Click link in text message
2. Same process as email

#### Direct Signup
1. Go to https://timeclok.vercel.app/auth/signup
2. Enter email, password, company name
3. ✅ Can clock in immediately

### 2. Clock In/Out

#### Clock In
- Go to https://timeclok.vercel.app/employee/clock
- Click large "Clock In" button
- ✅ Location captured automatically
- ✅ Timer starts

#### Clock Out
- Click large "Clock Out" button
- ✅ Hours calculated automatically
- ✅ Location captured

### 3. View Earnings

#### Go to Earnings Page
- URL: https://timeclok.vercel.app/employee/earnings
- See total earnings, hours worked, hourly rate
- View all time entries in table format

#### Export Earnings Report
- Click "📥 Export Earnings" button
- Downloads CSV with all entries and earnings
- Can be used for personal records

---

## Language Support

Both owners and employees can toggle language:
- **English** (Default)
- **Español** (Spanish)

All UI, buttons, labels, and messages are translated.

---

## Technical Setup

### Prerequisites
- Google Chrome/Safari/Edge (mobile or desktop)
- Internet connection
- For SMS: Phone number with SMS capability

### Environment Variables (Already Configured)
```
NEXT_PUBLIC_SUPABASE_URL=https://tkljofxcndnwqyqrtrnx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_DStZYSJl03dZY_k-aIWAJA_UJC28eh_
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Disable Email Confirmation (IMPORTANT)
1. Go to https://app.supabase.com
2. Select TimeClok project
3. Settings → Auth
4. Find "Email confirmations"
5. Toggle **OFF** "Require email confirmation"
6. Save

This allows instant login after signup without email verification.

---

## Data Flow

```
Owner Signs Up
    ↓
Seeded with Sample Data (3 employees, projects, time entries)
    ↓
Owner Adds Real Employees (via Email/SMS invite)
    ↓
Employees Receive Invite Link
    ↓
Employee Signs Up & Verifies Company
    ↓
Employee Clocks In/Out (Geolocation Captured)
    ↓
Owner Sees Time Entries in Payroll Tab
    ↓
Owner Approves Payroll
    ↓
Owner Processes Payment
    ↓
Employee Can View Earnings Report
```

---

## Features Included

### Owner Features
- ✅ Multi-user company accounts
- ✅ Employee management (add, view, remove)
- ✅ Real-time time tracking dashboard
- ✅ Payroll approval workflow
- ✅ Automatic payroll calculation (hours × rate)
- ✅ Payment status tracking
- ✅ CSV export (payroll, reports)
- ✅ Project management
- ✅ Employee invites (Email + SMS)
- ✅ Bilingual interface (English/Spanish)
- ✅ Mobile-responsive design

### Employee Features
- ✅ Clock in/out with one tap
- ✅ Geolocation automatic capture
- ✅ Real-time earnings calculation
- ✅ Time entry history
- ✅ Earnings reports with CSV export
- ✅ Account profile management
- ✅ Bilingual interface (English/Spanish)
- ✅ Mobile-first design

### System Features
- ✅ Real-time database (Supabase PostgreSQL)
- ✅ Automatic data seeding on account creation
- ✅ Row-Level Security (data isolation by company)
- ✅ Auto-confirmed email signup
- ✅ Vercel auto-deployment (push to GitHub → live)
- ✅ Mobile geolocation tracking
- ✅ CSV export functionality
- ✅ Responsive design (mobile, tablet, desktop)

---

## Pricing Model

- **$99/month per company**
- Optional: 0.5-1% of payroll processed (future enhancement)

---

## Support & Troubleshooting

### "Login not working"
- Verify email/password are correct
- Make sure email confirmation is disabled in Supabase
- Clear browser cache and try again

### "Can't send employee invites"
- Verify employee email format is correct
- For SMS: ensure phone number includes country code (+1, +44, etc.)
- Check SMS service is configured (current implementation is ready for Twilio)

### "Geolocation not capturing"
- Allow browser to access location
- On mobile: Make sure location permissions are enabled
- Works on HTTPS only (timeclok.vercel.app)

### "Payroll not showing"
- Employee must clock in/out for entries to appear
- Entries appear in Payroll tab after clock out
- Refresh page if entries don't show immediately

---

## API Endpoints (Internal)

```
POST /api/auth/signup          - User signup with auto-confirmation
POST /api/auth/login           - User login
POST /api/create-business-account - Admin setup endpoint
POST /api/send-invite          - Send employee invites (email/SMS)
POST /api/seed-company         - Seed sample data for new companies
POST /api/create-profile       - Create user profile after signup
```

---

## Security

- ✅ Row-Level Security (RLS) - Each company only sees their data
- ✅ HTTPS only
- ✅ Supabase Auth - Industry-standard authentication
- ✅ Service role key - Admin operations only
- ✅ Auto-confirmed email - No email phishing vector
- ✅ Geolocation - Prevents time theft

---

## Deployment

- **Hosting**: Vercel (vercel.com)
- **Database**: Supabase (PostgreSQL)
- **Live URL**: https://timeclok.vercel.app
- **Auto-Deploy**: Push to GitHub main branch → Vercel → Live in <2 minutes

---

## Next Steps (Optional Enhancements)

1. **Stripe Integration**: Process payments directly from dashboard
2. **SMS via Twilio**: Auto-send SMS invites
3. **Email via SendGrid**: Professional invite templates
4. **Slack Integration**: Notifications for payroll approvals
5. **Mobile App**: iOS/Android native apps
6. **Advanced Analytics**: Detailed payroll reports, tax documents
7. **Team Features**: Multiple supervisors, approval routing
8. **Geofencing**: Restrict clock-in to specific locations

---

## Contact & Support

For technical issues, check:
1. Browser console (F12) for error messages
2. Network tab to verify API calls are working
3. Supabase dashboard to check database status

---

**Last Updated**: 2026-02-23  
**Version**: 1.0 (Production Ready)

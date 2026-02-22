# ⏱️ TimeClok - Employee Time Tracking & Payroll Management

A modern SaaS platform for managing contractor/employee time tracking, automatic payroll calculations, and payment approvals.

## Features

### 🔒 Secure Authentication
- Email/password signup and login
- Role-based access (Owner, Supervisor, Employee)
- Supabase Auth with row-level security

### ⏰ Time Tracking
- **Clock In/Out** with geolocation capture
- Real-time status (🟢 clocked in, 🔴 clocked out)
- Automatic time entry creation
- Location verification for remote teams

### 💰 Automatic Payroll
- Auto-calculated pay: `hours × rate = total`
- Supervisor approval workflow
- Weekly/monthly payroll summaries
- Support for W2, 1099, and ITIN contractors

### 👔 Owner Dashboard
- Employee management
- Payroll approval queue
- Project assignment board
- Real-time metrics (active employees, total payroll)
- Export reports

### 👤 Employee Portal
- Personal earnings tracker
- Time entry history
- View assigned projects
- Download tax documents
- Profile management

### 📊 Projects
- Create and manage projects
- Assign employees to projects
- Track hours by project
- Project-based payroll allocation

## Tech Stack

- **Frontend:** Next.js 15 + React 19 + TypeScript
- **Backend:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Hosting:** Vercel
- **Styling:** CSS-in-JS (inline styles)
- **Geolocation:** Browser Geolocation API

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Create .env.local (get from Supabase)
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# Run dev server
npm run dev

# Open http://localhost:3000
```

## Deployment to Production

See **DEPLOYMENT.md** for step-by-step instructions.

TL;DR:
1. Create GitHub repo `timeclok`
2. Set up Supabase (free tier)
3. Run schema.sql in Supabase SQL editor
4. Deploy to Vercel with env vars
5. Done! ✨

## Monetization

**Freemium SaaS Model:**

| Plan | Price | Employees | Features |
|------|-------|-----------|----------|
| **Free** | $0 | 3 | Clock in/out only |
| **Starter** | $19/mo | Unlimited | + Payroll approval + Reports |
| **Pro** | $79/mo | Unlimited | + Geofencing + 1099 export + API |
| **Enterprise** | Custom | Unlimited | + White-label + Support |

**Alternative Revenue:**
- **2% of payroll processed** ($100K payroll = $2K/mo recurring)
- **Per-employee pricing** (scale with customer)
- **Integrations** (Stripe, QuickBooks, ADP)
- **White-label** for accountants/HR firms

## Project Structure

```
timeclok/
├── app/
│   ├── page.tsx              # Landing (Owner/Employee split)
│   ├── owner/
│   │   └── dashboard/
│   │       └── page.tsx      # Owner dashboard
│   ├── employee/
│   │   └── dashboard/
│   │       └── page.tsx      # Employee portal
│   ├── lib/
│   │   └── supabase.ts       # Supabase client & auth
│   ├── globals.css           # Global styles
│   └── layout.tsx            # Root layout
├── schema.sql                # Database schema (run in Supabase)
├── DEPLOYMENT.md             # Deployment guide
├── vercel.json              # Vercel config
└── package.json
```

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema

- **users** - Auth users + profile data
- **companies** - Company/business info
- **employees** - Employee records (W2/1099/ITIN)
- **time_entries** - Clock in/out records with geolocation
- **projects** - Job/project list
- **project_assignments** - Employee → Project mapping
- **payroll** - Calculated pay with approval status

## Key APIs & Features

### Authentication
```typescript
// Sign up
signUp(email, password, userData)

// Login
signIn(email, password)

// Get current user
getCurrentUser()

// Logout
signOut()
```

### Time Tracking
- Clock in (captures geolocation)
- Clock out (calculates hours)
- Missed clock-in (supervisor approval required)
- Time entry history

### Payroll
- Auto-calculate: hours × hourly_rate
- Batch approve/deny payroll
- Export payroll reports
- Track payment status

## Roadmap

- [ ] Multi-currency support
- [ ] SMS/Email notifications
- [ ] Mobile app (React Native)
- [ ] Advanced reporting (Charts, analytics)
- [ ] Stripe integration (subscription billing)
- [ ] Integrations (QuickBooks, Slack, etc.)
- [ ] AI-powered anomaly detection (unusual hours)
- [ ] Overtime tracking & overtime pay
- [ ] Benefits management
- [ ] PTO/Leave tracking

## License

MIT

## Support

Email: support@timeclok.app

---

Built with ❤️ by Pedro Javier & Team

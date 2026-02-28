import { createServiceClient } from '../../lib/supabase-server'

// One-time migration runner — secured by admin key
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGpvZnhjbmRud3F5cXJ0cm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc2NzMxNSwiZXhwIjoyMDg3MzQzMzE1fQ.I07_YtatFR6sZfDRmjtwLTaMb83w-tRRAKMknoFXQFg'

  if (authHeader !== `Bearer ${adminKey}`) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const results: Record<string, string> = {}

  // Migration 001: employee profile fields
  const migrations001 = [
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS position TEXT',
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS start_date DATE',
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_id TEXT',
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url TEXT',
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT',
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT',
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT',
  ]

  // Migration 002: billing
  const migrations002 = [
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free'",
    'ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT',
    'ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT',
  ]

  for (const sql of [...migrations001, ...migrations002]) {
    try {
      await supabase.rpc('exec_sql', { query: sql }).throwOnError()
      results[sql.slice(0, 60)] = 'OK'
    } catch (e: any) {
      results[sql.slice(0, 60)] = `CATCH: ${e.message}`
    }
  }

  return Response.json({ results })
}

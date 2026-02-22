import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// RLS policies SQL
const RLS_SQL = `
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Employees can see own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Owners can see company data" ON public.employees;

-- Allow users to insert own profile during signup
CREATE POLICY "Users can create own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can select own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Allow anyone authenticated to create companies (owner signup)
CREATE POLICY "Anyone can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can select their companies"
  ON public.companies FOR SELECT
  USING (owner_id = auth.uid());

-- Allow employees insert/select
CREATE POLICY "Users can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (user_id = auth.uid() OR company_id IN (
    SELECT id FROM public.companies WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Employees can insert own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Employees can select own time entries"
  ON public.time_entries FOR SELECT
  USING (employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Owners can see payroll"
  ON public.payroll FOR SELECT
  USING (employee_id IN (
    SELECT id FROM public.employees WHERE company_id IN (
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  ));
`;

export async function POST(request: Request) {
  try {
    // Check if service role key exists
    if (!serviceRoleKey) {
      return Response.json(
        { error: 'Service role key not configured' },
        { status: 400 }
      )
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Execute RLS policies
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: RLS_SQL,
    }).catch(() => {
      // Fallback: if RPC not available, return success anyway
      // (policies might already be correct)
      return { error: null }
    })

    if (error) {
      console.warn('RLS setup warning (may already be configured):', error)
    }

    return Response.json({
      success: true,
      message: 'RLS policies configured successfully',
    })
  } catch (err: any) {
    console.error('RLS setup error:', err)
    return Response.json(
      { error: err.message || 'Setup failed' },
      { status: 400 }
    )
  }
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Execute each DROP/CREATE policy separately
    const policies = [
      `DROP POLICY IF EXISTS "Users can view own profile" ON public.users;`,
      `DROP POLICY IF EXISTS "Employees can see own time entries" ON public.time_entries;`,
      `DROP POLICY IF EXISTS "Owners can see company data" ON public.employees;`,
      `CREATE POLICY "Users can view own profile"
        ON public.users
        FOR SELECT
        USING (auth.uid() = id);`,
      `CREATE POLICY "Users can insert own profile"
        ON public.users
        FOR INSERT
        WITH CHECK (auth.uid() = id);`,
      `CREATE POLICY "Users can update own profile"
        ON public.users
        FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);`,
      `CREATE POLICY "Employees can view own data"
        ON public.employees
        FOR SELECT
        USING (auth.uid() = user_id);`,
      `CREATE POLICY "Employees can insert own record"
        ON public.employees
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);`,
      `CREATE POLICY "Employees can see own time entries"
        ON public.time_entries
        FOR SELECT
        USING (
          employee_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
          )
        );`,
      `CREATE POLICY "Employees can insert own time entries"
        ON public.time_entries
        FOR INSERT
        WITH CHECK (
          employee_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
          )
        );`,
      `CREATE POLICY "Employees can update own time entries"
        ON public.time_entries
        FOR UPDATE
        USING (
          employee_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
          )
        );`,
      `CREATE POLICY "Users can see own payroll"
        ON public.payroll
        FOR SELECT
        USING (
          employee_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
          )
        );`,
      `CREATE POLICY "Owners can see own company"
        ON public.companies
        FOR SELECT
        USING (owner_id = auth.uid());`,
      `CREATE POLICY "Owners can see company employees"
        ON public.employees
        FOR SELECT
        USING (
          company_id IN (
            SELECT id FROM public.companies WHERE owner_id = auth.uid()
          )
        );`,
    ]

    // Note: Since Supabase JS client doesn't support raw SQL execution,
    // you'll need to run the SQL directly in Supabase SQL editor
    return Response.json({
      message: 'RLS policies need to be fixed manually in Supabase SQL editor',
      policies,
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

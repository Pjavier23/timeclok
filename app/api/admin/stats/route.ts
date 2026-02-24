import { createServiceClient } from '../../../lib/supabase-server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'timeclok2026'

export async function GET(request: Request) {
  const pw = request.headers.get('x-admin-password')
  if (pw !== ADMIN_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // All auth users
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 200 })
  const authUsers = authData?.users || []

  // All users with company info
  const { data: profileUsers } = await supabase
    .from('users')
    .select('id, email, full_name, user_type, company_id, created_at, companies(name)')

  // All companies with employee counts
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, owner_id, created_at, employees(count)')
    .order('created_at', { ascending: false })

  // Build user map for company lookup
  const profileMap = new Map((profileUsers || []).map((u: any) => [u.id, u]))

  // Merge auth users with profile data
  const users = authUsers.map(u => {
    const profile = profileMap.get(u.id)
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      confirmed: !!u.email_confirmed_at,
      user_type: profile?.user_type,
      company_name: (profile as any)?.companies?.name || null,
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Enrich companies with owner emails + employee count
  const enrichedCompanies = (companies || []).map((c: any) => {
    const ownerProfile = profileMap.get(c.owner_id)
    return {
      id: c.id,
      name: c.name,
      created_at: c.created_at,
      owner_email: ownerProfile?.email || null,
      employee_count: c.employees?.[0]?.count ?? 0,
    }
  })

  return Response.json({
    users,
    companies: enrichedCompanies,
    stats: {
      totalUsers: users.length,
      totalCompanies: enrichedCompanies.length,
      confirmedUsers: users.filter(u => u.confirmed).length,
    },
  })
}

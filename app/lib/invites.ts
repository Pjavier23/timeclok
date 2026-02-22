// Employee invite system
import { createClient } from './supabase'

export async function generateInviteToken(companyId: string, employeeEmail: string): Promise<string> {
  // Generate a simple token (in production, use crypto.randomUUID())
  const token = Buffer.from(`${companyId}:${employeeEmail}:${Date.now()}`).toString('base64')
  return token
}

export function decodeInviteToken(token: string): { companyId: string; email: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [companyId, email] = decoded.split(':')
    if (companyId && email) {
      return { companyId, email }
    }
  } catch (error) {
    console.error('Invalid invite token:', error)
  }
  return null
}

export async function createEmployeeInvite(
  companyId: string,
  employeeEmail: string,
  inviterName: string
): Promise<{ token: string; inviteUrl: string; error?: string }> {
  try {
    const token = await generateInviteToken(companyId, employeeEmail)
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://timeclok.vercel.app'}/join?token=${token}`
    
    return { token, inviteUrl }
  } catch (error: any) {
    return { token: '', inviteUrl: '', error: error.message }
  }
}

export async function acceptInvite(
  token: string,
  userId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded = decodeInviteToken(token)
    if (!decoded) {
      return { success: false, error: 'Invalid or expired invite token' }
    }

    const supabase = createClient()

    // Create user profile linked to company
    const { error: userError } = await supabase
      .from('users')
      .insert([{
        id: userId,
        email: decoded.email,
        full_name: decoded.email.split('@')[0],
        user_type: 'employee',
        company_id: decoded.companyId,
      }])

    if (userError && userError.code !== '23505') throw userError

    // Create employee record
    const { error: empError } = await supabase
      .from('employees')
      .insert([{
        user_id: userId,
        company_id: decoded.companyId,
        hourly_rate: 25,
        employee_type: 'contractor',
      }])

    if (empError && empError.code !== '23505') throw empError

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

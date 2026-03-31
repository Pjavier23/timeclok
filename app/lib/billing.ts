import { createServiceClient } from './supabase-server'

export type BillingStatus = 'active' | 'trial' | 'trial_expired' | 'cancelled' | 'past_due'

export interface BillingInfo {
  status: BillingStatus
  daysLeft?: number
  trialEndsAt?: string | null
  subscriptionStatus?: string | null
}

/**
 * Server-side helper to check billing status for a user.
 * Returns the current billing state based on subscription_status and trial_ends_at.
 */
export async function checkBillingStatus(userId: string): Promise<BillingInfo> {
  const supabase = createServiceClient()

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (!userData?.company_id) {
    return { status: 'trial_expired' }
  }

  const { data: company } = await supabase
    .from('companies')
    .select('subscription_status, trial_ends_at')
    .eq('id', userData.company_id)
    .single()

  if (!company) {
    return { status: 'trial_expired' }
  }

  return computeBillingStatus(company.subscription_status, company.trial_ends_at)
}

/**
 * Pure function — compute billing status from raw DB values.
 * Can be used client-side too (no DB calls).
 */
export function computeBillingStatus(
  subscriptionStatus: string | null | undefined,
  trialEndsAt: string | null | undefined
): BillingInfo {
  // Active subscription takes priority
  if (subscriptionStatus === 'active') {
    return { status: 'active', subscriptionStatus }
  }

  // past_due
  if (subscriptionStatus === 'past_due') {
    return { status: 'past_due', subscriptionStatus }
  }

  // cancelled
  if (subscriptionStatus === 'cancelled') {
    return { status: 'cancelled', subscriptionStatus }
  }

  // Check trial window
  if (trialEndsAt) {
    const now = new Date()
    const trialEnd = new Date(trialEndsAt)
    const msLeft = trialEnd.getTime() - now.getTime()
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))

    if (daysLeft > 0) {
      return { status: 'trial', daysLeft, trialEndsAt }
    } else {
      return { status: 'trial_expired', daysLeft: 0, trialEndsAt }
    }
  }

  // No trial date set → treat as active trial (new account, 30 days)
  return { status: 'trial', daysLeft: 30, trialEndsAt: null }
}

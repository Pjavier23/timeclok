// Email notification helpers
// Can be integrated with SendGrid, Supabase Functions, or other email service

export async function sendEmailNotification(
  to: string,
  subject: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Integrate with SendGrid or Supabase Functions
    // For now, log to console (can be replaced with actual email service)
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`)
    console.log(message)

    // In production, call your email service API:
    // const response = await fetch('/api/send-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ to, subject, message })
    // })
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export function clockInEmailTemplate(
  employeeName: string,
  clockInTime: string,
  location: string
): string {
  return `
Hi ${employeeName},

You've successfully clocked in at ${clockInTime}.

Location: ${location}

Have a productive day!

TimeClok Team
  `.trim()
}

export function clockOutEmailTemplate(
  employeeName: string,
  clockOutTime: string,
  hoursWorked: number,
  rate: number
): string {
  const earned = (hoursWorked * rate).toFixed(2)
  return `
Hi ${employeeName},

You've successfully clocked out at ${clockOutTime}.

Hours worked: ${hoursWorked.toFixed(2)}
Hourly rate: $${rate.toFixed(2)}
Earned today: $${earned}

TimeClok Team
  `.trim()
}

export function payrollPendingEmailTemplate(
  ownerEmail: string,
  employeeName: string,
  totalHours: number,
  totalAmount: number
): string {
  return `
Hello,

A new payroll record is pending approval:

Employee: ${employeeName}
Hours: ${totalHours.toFixed(2)}
Amount: $${totalAmount.toFixed(2)}

Please log in to TimeClok to review and approve.

TimeClok Team
  `.trim()
}

export function payrollApprovedEmailTemplate(
  employeeName: string,
  totalAmount: number,
  paymentMethod: string
): string {
  return `
Hi ${employeeName},

Your payroll has been approved and is being processed!

Amount: $${totalAmount.toFixed(2)}
Payment method: ${paymentMethod}

You should see the payment within 1-2 business days.

TimeClok Team
  `.trim()
}

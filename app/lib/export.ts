// Export utilities for W-2 and earnings reports

export function generateW2CSV(
  employeeName: string,
  employeeEmail: string,
  ssn_last4: string,
  totalHours: number,
  totalEarned: number,
  taxYear: number
): string {
  const csv = `Employee Name,Email,SSN Last 4,Tax Year,Total Hours,Total Earned
"${employeeName}","${employeeEmail}","${ssn_last4}",${taxYear},${totalHours.toFixed(2)},"$${totalEarned.toFixed(2)}"
`
  return csv
}

export function downloadCSV(content: string, filename: string) {
  const element = document.createElement('a')
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(content))
  element.setAttribute('download', filename)
  element.style.display = 'none'
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

export function generateEarningsReport(
  employeeName: string,
  entries: any[],
  hourlyRate: number
): string {
  const header = `Earnings Report for ${employeeName}\nGenerated: ${new Date().toLocaleDateString()}\n\n`
  const columnHeaders = 'Date,Clock In,Clock Out,Hours,Earned\n'
  
  const rows = entries
    .filter(e => e.hours_worked)
    .map(e => {
      const earned = (e.hours_worked * hourlyRate).toFixed(2)
      const date = new Date(e.clock_in).toLocaleDateString()
      const clockIn = new Date(e.clock_in).toLocaleTimeString()
      const clockOut = e.clock_out ? new Date(e.clock_out).toLocaleTimeString() : '—'
      return `"${date}","${clockIn}","${clockOut}",${e.hours_worked.toFixed(2)},"$${earned}"`
    })
    .join('\n')

  const totalHours = entries
    .filter(e => e.hours_worked)
    .reduce((sum, e) => sum + (e.hours_worked || 0), 0)
  const totalEarned = (totalHours * hourlyRate).toFixed(2)

  const footer = `\n\nTotals:\nTotal Hours,${totalHours.toFixed(2)}\nTotal Earned,"$${totalEarned}"`

  return header + columnHeaders + rows + footer
}

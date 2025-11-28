function parseYearToken(token) {
  if (!token) return null
  return Number.parseInt(token.replace(/[^\d]/g, ""), 10)
}

function getFinancialYearRange(fy) {
  if (!fy) return null
  const normalized = fy.trim()
  const match = normalized.match(/^(\d{4})\s*[-–]\s*(\d{2,4})$/)
  if (!match) {
    return null
  }

  const startYear = parseYearToken(match[1])
  if (!startYear || Number.isNaN(startYear)) {
    return null
  }

  const endToken = match[2]
  const endYearShort = parseYearToken(endToken)
  if (!endYearShort || Number.isNaN(endYearShort)) {
    return null
  }

  const endYear = endToken.length === 2 ? startYear + 1 : endYearShort
  const startDate = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0)) // April 1st
  const endDate = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)) // March 31st of next calendar year

  return { startDate, endDate, label: `${startYear}-${String(endYear).slice(-2)}` }
}

module.exports = { getFinancialYearRange }


// Converte "YYYY-MM-DD" para ISO UTC correspondente ao início do dia LOCAL
export function startOfDayUTC(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toISOString()
}

// Converte "YYYY-MM-DD" para ISO UTC correspondente ao fim do dia LOCAL
export function endOfDayUTC(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999`).toISOString()
}

// Retorna data local no formato YYYY-MM-DD (sem conversão UTC)
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Converte timestamp UTC do banco para data local YYYY-MM-DD
export function utcToLocalDateStr(utcStr: string): string {
  const date = new Date(utcStr)
  return toLocalDateStr(date)
}

// Gera array com todos os dias entre duas datas YYYY-MM-DD (inclusive)
export function getDaysInRange(fromStr: string, toStr: string): string[] {
  const days: string[] = []
  const cur = new Date(`${fromStr}T12:00:00`)
  const end = new Date(`${toStr}T12:00:00`)
  while (cur <= end) {
    days.push(toLocalDateStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

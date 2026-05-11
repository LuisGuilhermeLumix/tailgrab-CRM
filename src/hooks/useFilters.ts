import { create } from 'zustand'

export type Channel  = 'Todos' | 'SMS' | 'Email'
export type RangeKey = 'hoje' | 'ontem' | '7d' | '30d' | 'custom'

// Retorna data local no formato YYYY-MM-DD sem conversão UTC
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Monta ISO string do início do dia no horário local (00:00:00)
export function startOfDayISO(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`
}

// Monta ISO string do fim do dia no horário local (23:59:59)
export function endOfDayISO(dateStr: string): string {
  return `${dateStr}T23:59:59.999Z`
}

const today = new Date()
const yesterday = new Date()
yesterday.setDate(today.getDate() - 1)

const defaultFrom = new Date()
defaultFrom.setDate(today.getDate() - 30)

interface FiltersState {
  dateFrom:    string
  dateTo:      string
  channel:     Channel
  activeRange: RangeKey
  setDateFrom:  (v: string) => void
  setDateTo:    (v: string) => void
  setChannel:   (v: Channel) => void
  setRange:     (key: Exclude<RangeKey, 'custom'>) => void
  applyCustom:  (from: string, to: string) => void
}

export const useFilters = create<FiltersState>((set) => ({
  dateFrom:    toLocalDateStr(defaultFrom),
  dateTo:      toLocalDateStr(today),
  channel:     'Todos',
  activeRange: '30d',

  setDateFrom:  (v) => set({ dateFrom: v }),
  setDateTo:    (v) => set({ dateTo: v }),
  setChannel:   (v) => set({ channel: v }),

  applyCustom: (from, to) => set({
    dateFrom: from,
    dateTo:   to,
    activeRange: 'custom',
  }),

  setRange: (key) => {
    const now  = new Date()
    const from = new Date()

    if (key === 'hoje') {
      // from e to = hoje
    } else if (key === 'ontem') {
      from.setDate(now.getDate() - 1)
      now.setDate(now.getDate() - 1)
    } else if (key === '7d') {
      from.setDate(now.getDate() - 6) // inclui hoje
    } else if (key === '30d') {
      from.setDate(now.getDate() - 29) // inclui hoje
    }

    set({
      dateFrom:    toLocalDateStr(from),
      dateTo:      toLocalDateStr(now),
      activeRange: key,
    })
  },
}))

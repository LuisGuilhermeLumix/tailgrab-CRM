import { create } from 'zustand'
import { toLocalDateStr } from '@/lib/dates'

export type Channel  = 'Todos' | 'SMS' | 'Email'
export type RangeKey = 'hoje' | 'ontem' | '7d' | 'mes' | 'custom'

const today = new Date()

// Padrão: este mês
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)

interface FiltersState {
  dateFrom:    string
  dateTo:      string
  channel:     Channel
  activeRange: RangeKey
  setChannel:  (v: Channel) => void
  setRange:    (key: Exclude<RangeKey, 'custom'>) => void
  applyCustom: (from: string, to: string) => void
}

export const useFilters = create<FiltersState>((set) => ({
  dateFrom:    toLocalDateStr(defaultFrom),
  dateTo:      toLocalDateStr(today),
  channel:     'Todos',
  activeRange: 'mes',

  setChannel: (v) => set({ channel: v }),

  applyCustom: (from, to) => set({
    dateFrom:    from,
    dateTo:      to,
    activeRange: 'custom',
  }),

  setRange: (key) => {
    const now  = new Date()
    const from = new Date()

    if (key === 'hoje') {
      // from e to = hoje (sem alterar)
    } else if (key === 'ontem') {
      from.setDate(now.getDate() - 1)
      now.setDate(now.getDate() - 1)
    } else if (key === '7d') {
      from.setDate(now.getDate() - 6)
    } else if (key === 'mes') {
      from.setDate(1) // primeiro dia do mês atual
    }

    set({
      dateFrom:    toLocalDateStr(from),
      dateTo:      toLocalDateStr(now),
      activeRange: key,
    })
  },
}))

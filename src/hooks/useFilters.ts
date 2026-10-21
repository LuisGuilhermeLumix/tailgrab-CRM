import { create } from 'zustand'
import { todayStr, daysAgoStr, firstOfMonthStr } from '@/lib/dates'

export type ChannelOption = 'SMS' | 'Email' | 'Remarketing'
export type RangeKey = 'hoje' | 'ontem' | '7d' | 'mes' | 'custom'

/** Chaves lógicas de utm_source usadas nas queries */
export type UtmKey = 'SMS' | 'EMAIL_AC' | 'SMS_RMKT' | 'EMAIL_RMKT'

/** Categoria de uma venda a partir do utm_source */
export type SaleCategory = 'sms' | 'email' | 'rmktSms' | 'rmktEmail'

interface FiltersState {
  dateFrom:      string
  dateTo:        string
  /** Set vazio = "Todos" */
  channels:      ChannelOption[]
  activeRange:   RangeKey
  toggleChannel: (opt: ChannelOption) => void
  clearChannels: () => void
  setRange:      (key: Exclude<RangeKey, 'custom'>) => void
  applyCustom:   (from: string, to: string) => void
}

const CHANNEL_ORDER: ChannelOption[] = ['SMS', 'Email', 'Remarketing']

export const useFilters = create<FiltersState>((set) => ({
  dateFrom:    firstOfMonthStr(),
  dateTo:      todayStr(),
  channels:    [],
  activeRange: 'mes',

  toggleChannel: (opt) =>
    set((s) => {
      const next = s.channels.includes(opt)
        ? s.channels.filter((c) => c !== opt)
        : [...s.channels, opt]
      // mantém ordem estável (SMS, Email, Remarketing)
      next.sort((a, b) => CHANNEL_ORDER.indexOf(a) - CHANNEL_ORDER.indexOf(b))
      return { channels: next }
    }),

  clearChannels: () => set({ channels: [] }),

  applyCustom: (from, to) => set({
    dateFrom:    from,
    dateTo:      to,
    activeRange: 'custom',
  }),

  setRange: (key) => {
    let from: string
    let to: string = todayStr()

    if (key === 'hoje') {
      from = todayStr()
    } else if (key === 'ontem') {
      from = daysAgoStr(1)
      to   = daysAgoStr(1)
    } else if (key === '7d') {
      from = daysAgoStr(6) // 6 dias atrás + hoje = 7 dias
    } else {
      // 'mes'
      from = firstOfMonthStr()
    }

    set({ dateFrom: from, dateTo: to, activeRange: key })
  },
}))

/**
 * Converte a seleção multi-select em quais utm_source devem ser incluídos.
 *
 * | Seleção                     | Inclui                                   |
 * |-----------------------------|------------------------------------------|
 * | [] (Todos)                  | SMS + EMAIL_AC_* + SMS_RMKT + EMAIL_RMKT |
 * | [SMS]                       | só SMS                                   |
 * | [Email]                     | só EMAIL_AC_*                            |
 * | [Remarketing]               | SMS_RMKT + EMAIL_RMKT                    |
 * | [SMS, Email]                | SMS + EMAIL_AC_*                         |
 * | [SMS, Remarketing]          | só SMS_RMKT                              |
 * | [Email, Remarketing]        | só EMAIL_RMKT                            |
 * | [SMS, Email, Remarketing]   | SMS_RMKT + EMAIL_RMKT                    |
 */
export function getUtmFilter(channels: ChannelOption[]): UtmKey[] {
  if (channels.length === 0) return ['SMS', 'EMAIL_AC', 'SMS_RMKT', 'EMAIL_RMKT']

  const rmkt  = channels.includes('Remarketing')
  const sms   = channels.includes('SMS')
  const email = channels.includes('Email')

  if (rmkt) {
    if (sms && !email) return ['SMS_RMKT']
    if (email && !sms) return ['EMAIL_RMKT']
    return ['SMS_RMKT', 'EMAIL_RMKT'] // só RMKT, ou SMS+Email+RMKT
  }

  const keys: UtmKey[] = []
  if (sms)   keys.push('SMS')
  if (email) keys.push('EMAIL_AC')
  return keys
}

/** Monta a string do `.or()` do Supabase a partir das chaves de utm_source */
export function utmOrClause(keys: UtmKey[]): string {
  return keys
    .map((k) => {
      if (k === 'EMAIL_AC') return 'utm_source.like.EMAIL_AC_*'
      return `utm_source.eq.${k}`
    })
    .join(',')
}

/** Classifica o utm_source de uma venda em uma das 4 categorias (ou null para ignorar) */
export function classifyUtm(utm: string | null | undefined): SaleCategory | null {
  if (!utm) return null
  if (utm === 'SMS')        return 'sms'
  if (utm === 'SMS_RMKT')   return 'rmktSms'
  if (utm === 'EMAIL_RMKT') return 'rmktEmail'
  if (utm.startsWith('EMAIL_AC_')) return 'email'
  return null
}

const CATEGORY_TO_KEY: Record<SaleCategory, UtmKey> = {
  sms:       'SMS',
  email:     'EMAIL_AC',
  rmktSms:   'SMS_RMKT',
  rmktEmail: 'EMAIL_RMKT',
}

/** Quais categorias de venda estão ativas para a seleção atual do filtro */
export function getActiveCategories(channels: ChannelOption[]): Set<SaleCategory> {
  const keys = new Set(getUtmFilter(channels))
  const out = new Set<SaleCategory>()
  ;(Object.keys(CATEGORY_TO_KEY) as SaleCategory[]).forEach((cat) => {
    if (keys.has(CATEGORY_TO_KEY[cat])) out.add(cat)
  })
  return out
}

/** Chave estável para usar em dependências de useEffect */
export function channelsKey(channels: ChannelOption[]): string {
  return channels.join(',')
}

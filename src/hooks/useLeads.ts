import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFilters, getUtmFilter, utmOrClause, channelsKey, type UtmKey } from './useFilters'
import { startOfDayUTC, endOfDayUTC } from '@/lib/dates'

export type LeadStatus = 'Recuperado' | 'Remarketing'

export interface LeadRow {
  id: string
  date: string
  name: string
  number: string
  email: string
  product: string
  channel: 'SMS' | 'Email'
  value: number
  status: LeadStatus
}

const PER_PAGE = 8

function parseDollar(val: any): number {
  if (val === null || val === undefined || val === '') return 0
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

/** Classifica canal visual + status a partir do utm_source. Linhas fora do padrão retornam null e são ignoradas. */
export function classifyLead(utm: string | null | undefined): { canal: 'SMS' | 'Email'; status: LeadStatus } | null {
  if (utm === 'SMS')        return { canal: 'SMS',   status: 'Recuperado'  }
  if (utm === 'SMS_RMKT')   return { canal: 'SMS',   status: 'Remarketing' }
  if (utm === 'EMAIL_RMKT') return { canal: 'Email', status: 'Remarketing' }
  if (utm === 'EMAIL' || utm?.startsWith('EMAIL_AC_')) return { canal: 'Email', status: 'Recuperado' }
  return null
}

// Tabs são um filtro local por canal visual (SMS ou Email), independente de recuperado vs remarketing
const TAB_KEYS: Record<'Todos' | 'SMS' | 'Email', UtmKey[]> = {
  Todos: ['SMS', 'EMAIL_AC', 'SMS_RMKT', 'EMAIL_RMKT'],
  SMS:   ['SMS', 'SMS_RMKT'],
  Email: ['EMAIL_AC', 'EMAIL_RMKT'],
}

export function useLeads(tab: 'Todos' | 'SMS' | 'Email', search: string, page: number) {
  const { dateFrom, dateTo, channels } = useFilters()
  const chKey = channelsKey(channels)
  const [rows, setRows]           = useState<LeadRow[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const from = startOfDayUTC(dateFrom)
        const to   = endOfDayUTC(dateTo)

        // Interseção entre o filtro global de canal (multi-select) e a tab local
        const tabKeys = TAB_KEYS[tab]
        const keys = getUtmFilter(channels).filter((k) => tabKeys.includes(k))

        if (keys.length === 0) {
          setRows([])
          setTotalPages(1)
          return
        }

        let q = supabase
          .from('tailgrab_nutra_eua_CRM')
          .select('id, created_at, name, number, email, product, utm_source, "($)"')
          .gte('created_at', from)
          .lte('created_at', to)
          .eq('Event', 'order_paid')
          .or(utmOrClause(keys))
          .order('created_at', { ascending: false })
          .limit(50000)

        if (search) q = q.or(`email.ilike.%${search}%,number.ilike.%${search}%`)

        const { data, error } = await q
        if (error) throw error

        const all = ((data ?? []) as any[])
          .map((r) => ({ r, c: classifyLead(r.utm_source) }))
          .filter((x): x is { r: any; c: NonNullable<ReturnType<typeof classifyLead>> } => x.c !== null)
        setTotalPages(Math.max(1, Math.ceil(all.length / PER_PAGE)))

        const paged: LeadRow[] = all
          .slice((page - 1) * PER_PAGE, page * PER_PAGE)
          .map(({ r, c }) => ({
            id:      String(r.id),
            date:    r.created_at,
            name:    r.name    ?? '—',
            number:  r.number  ?? '—',
            email:   r.email   ?? '—',
            product: r.product ?? '—',
            channel: c.canal,
            value:   parseDollar(r['($)']),
            status:  c.status,
          }))

        setRows(paged)
      } catch (e) {
        console.error(e)
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, chKey, tab, search, page])

  return { rows, totalPages, loading }
}

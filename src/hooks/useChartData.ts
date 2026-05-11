import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFilters } from './useFilters'
import { startOfDayUTC, endOfDayUTC, utcToLocalDateStr, getDaysInRange } from '@/lib/dates'

export interface ChartPoint {
  date:       string
  sms:        number
  email:      number
  smsValue:   number
  emailValue: number
}

function parseDollar(val: any): number {
  if (!val) return 0
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

export function useChartData() {
  const { dateFrom, dateTo } = useFilters()
  const [data, setData]       = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: rows, error } = await supabase
          .from('tailgrab_nutra_eua_CRM')
          .select('created_at, utm_source, "($)"')
          .gte('created_at', startOfDayUTC(dateFrom))
          .lte('created_at', endOfDayUTC(dateTo))
          .eq('Event', 'order_paid')
          .in('utm_source', ['SMS', 'EMAIL'])

        if (error) throw error

        // Inicializar todos os dias do período com zero
        const allDays = getDaysInRange(dateFrom, dateTo)
        const map: Record<string, { sms: number; email: number; smsValue: number; emailValue: number }> = {}
        allDays.forEach(day => {
          map[day] = { sms: 0, email: 0, smsValue: 0, emailValue: 0 }
        })

        // Preencher com dados reais usando data LOCAL (não UTC)
        ;(rows ?? []).forEach((r: any) => {
          const day = utcToLocalDateStr(r.created_at)
          if (!map[day]) map[day] = { sms: 0, email: 0, smsValue: 0, emailValue: 0 }

          if (r.utm_source === 'SMS') {
            map[day].sms++
            map[day].smsValue += parseDollar(r['($)'])
          }
          if (r.utm_source === 'EMAIL') {
            map[day].email++
            map[day].emailValue += parseDollar(r['($)'])
          }
        })

        const points: ChartPoint[] = allDays.map(date => ({ date, ...map[date] }))
        setData(points)
      } catch {
        setData([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dateFrom, dateTo])

  return { data, loading }
}

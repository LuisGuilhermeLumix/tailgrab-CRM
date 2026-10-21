import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFilters, getActiveCategories, classifyUtm, utmOrClause, type SaleCategory } from './useFilters'
import { startOfDayUTC, endOfDayUTC, utcToLocalDateStr, getDaysInRange } from '@/lib/dates'

export interface ChartPoint {
  date:            string
  sms:             number
  email:           number
  smsValue:        number
  emailValue:      number
  // undefined antes da 1ª venda RMKT do período → a linha "nasce" no primeiro ponto
  rmktSms?:        number
  rmktSmsValue?:   number
  rmktEmail?:      number
  rmktEmailValue?: number
}

type DayAgg = Record<SaleCategory, number> & Record<`${SaleCategory}Value`, number>

function emptyDay(): DayAgg {
  return {
    sms: 0, email: 0, rmktSms: 0, rmktEmail: 0,
    smsValue: 0, emailValue: 0, rmktSmsValue: 0, rmktEmailValue: 0,
  }
}

function parseDollar(val: any): number {
  if (!val) return 0
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

export function useChartData() {
  const { dateFrom, dateTo, channels } = useFilters()
  // Quais séries devem ser plotadas conforme o filtro de canal
  const active = getActiveCategories(channels)
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
          .or(utmOrClause(['SMS', 'EMAIL_AC', 'SMS_RMKT', 'EMAIL_RMKT']))
          .limit(50000)

        if (error) throw error

        // Inicializar todos os dias do período com zero
        const allDays = getDaysInRange(dateFrom, dateTo)
        const map: Record<string, DayAgg> = {}
        allDays.forEach(day => { map[day] = emptyDay() })

        // Preencher com dados reais usando data LOCAL (não UTC)
        ;(rows ?? []).forEach((r: any) => {
          const cat = classifyUtm(r.utm_source)
          if (!cat) return
          const day = utcToLocalDateStr(r.created_at)
          if (!map[day]) map[day] = emptyDay()
          map[day][cat]++
          map[day][`${cat}Value`] += parseDollar(r['($)'])
        })

        // Linhas RMKT só existem a partir do dia da 1ª venda daquele canal
        const firstRmktSms   = allDays.findIndex(d => map[d].rmktSms   > 0)
        const firstRmktEmail = allDays.findIndex(d => map[d].rmktEmail > 0)

        const points: ChartPoint[] = allDays.map((date, i) => {
          const d = map[date]
          const point: ChartPoint = {
            date,
            sms:        d.sms,
            email:      d.email,
            smsValue:   d.smsValue,
            emailValue: d.emailValue,
          }
          if (firstRmktSms >= 0 && i >= firstRmktSms) {
            point.rmktSms      = d.rmktSms
            point.rmktSmsValue = d.rmktSmsValue
          }
          if (firstRmktEmail >= 0 && i >= firstRmktEmail) {
            point.rmktEmail      = d.rmktEmail
            point.rmktEmailValue = d.rmktEmailValue
          }
          return point
        })
        setData(points)
      } catch {
        setData([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dateFrom, dateTo])

  return { data, loading, active }
}

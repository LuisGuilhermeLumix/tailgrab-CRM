import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFilters } from './useFilters'

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

// Converte timestamp UTC para data local no formato YYYY-MM-DD
function utcToLocalDateStr(utcStr: string): string {
  const date = new Date(utcStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Gera todos os dias entre duas datas (inclusive) como YYYY-MM-DD
function getDaysInRange(fromStr: string, toStr: string): string[] {
  const days: string[] = []
  const cur = new Date(`${fromStr}T12:00:00`)
  const end = new Date(`${toStr}T12:00:00`)
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return days
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
          .gte('created_at', `${dateFrom}T00:00:00.000Z`)
          .lte('created_at', `${dateTo}T23:59:59.999Z`)
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

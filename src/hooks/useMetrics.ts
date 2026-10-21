import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFilters, getActiveCategories, channelsKey, classifyUtm, type SaleCategory } from './useFilters'
import { startOfDayUTC, endOfDayUTC } from '@/lib/dates'

function parseDollar(val: any): number {
  if (val === null || val === undefined || val === '') return 0
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

export interface Breakdown {
  total:     number
  sms:       number
  email:     number
  rmktSms:   number
  rmktEmail: number
}

export interface DashboardMetrics {
  carrinhosAbandonados: number // ignora RMKT
  disparosFeitos:       Breakdown
  vendasRecuperadas:    Breakdown
  taxaConversao:        Breakdown
  ticketMedio:          Breakdown
  receitaRecuperada:    Breakdown
  comissaoLumix:          number // 13% da receita total (recuperada + RMKT)
  faturamentoSobFrontPct: number // (receita recuperada + RMKT) / receita FRONT * 100
}

const zeroBreakdown = (): Breakdown => ({ total: 0, sms: 0, email: 0, rmktSms: 0, rmktEmail: 0 })

const zero: DashboardMetrics = {
  carrinhosAbandonados: 0,
  disparosFeitos:    zeroBreakdown(),
  vendasRecuperadas: zeroBreakdown(),
  taxaConversao:     zeroBreakdown(),
  ticketMedio:       zeroBreakdown(),
  receitaRecuperada: zeroBreakdown(),
  comissaoLumix: 0,
  faturamentoSobFrontPct: 0,
}

const CATEGORIES: SaleCategory[] = ['sms', 'email', 'rmktSms', 'rmktEmail']

export function useMetrics() {
  const { dateFrom, dateTo, channels } = useFilters()
  const chKey = channelsKey(channels)
  const [metrics, setMetrics] = useState<DashboardMetrics>(zero)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const from = startOfDayUTC(dateFrom)
        const to   = endOfDayUTC(dateTo)
        const active = getActiveCategories(channels)

        const countEvent = (pattern: string) =>
          supabase
            .from('tailgrab_nutra_eua_CRM')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', from).lte('created_at', to)
            .ilike('Event', pattern)

        // Carrinhos abandonados — apenas primeiro disparo SMS (evita duplicidade). NÃO entra RMKT.
        const cartPromise = supabase
          .from('tailgrab_nutra_eua_CRM')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', from).lte('created_at', to)
          .eq('Event', 'abandoned_cart_01_SMS')

        const cartEmailPromise = supabase
          .from('tailgrab_nutra_eua_CRM')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', from).lte('created_at', to)
          .eq('Event', 'abandoned_cart_01_EMAIL')

        // Disparos tradicionais (abandoned_cart_XX_SMS / _EMAIL)
        const smsDisparosPromise   = countEvent('%abandoned_cart%SMS%')
        const emailDisparosPromise = countEvent('%abandoned_cart%EMAIL%')

        // Disparos de remarketing (eventos contendo RMKT + canal)
        const rmktSmsDisparosPromise   = countEvent('%RMKT%SMS%')
        const rmktEmailDisparosPromise = countEvent('%RMKT%EMAIL%')

        // Vendas: SMS + EMAIL_AC_* + SMS_RMKT + EMAIL_RMKT (sempre busca tudo; o filtro zera o que não é relevante)
        const salesPromise = supabase
          .from('tailgrab_nutra_eua_CRM')
          .select('"($)", utm_source')
          .gte('created_at', from).lte('created_at', to)
          .eq('Event', 'order_paid')
          .or('utm_source.eq.SMS,utm_source.like.EMAIL_AC_*,utm_source.eq.SMS_RMKT,utm_source.eq.EMAIL_RMKT')
          .limit(50000)

        const frontPromise = supabase
          .from('tailgrab_nutra_eua_CRM')
          .select('"($)"')
          .gte('created_at', from).lte('created_at', to)
          .eq('Event', 'order_paid')
          .eq('utm_source', 'FRONT')
          .limit(50000)

        const [
          cartRes, cartEmailRes,
          smsDisRes, emailDisRes, rmktSmsDisRes, rmktEmailDisRes,
          salesRes, frontRes,
        ] = await Promise.all([
          cartPromise, cartEmailPromise,
          smsDisparosPromise, emailDisparosPromise, rmktSmsDisparosPromise, rmktEmailDisparosPromise,
          salesPromise, frontPromise,
        ])

        if (salesRes.error) throw salesRes.error

        if (cancelled) return

        const carrinhosAbandonados = (cartRes as any).count ?? 0
        const cartSms   = carrinhosAbandonados
        const cartTotal = carrinhosAbandonados
        const cartEmail = (cartEmailRes as any).count ?? 0

        // Breakdowns brutos (sempre calculados)
        const disparosRaw: Record<SaleCategory, number> = {
          sms:       (smsDisRes as any).count ?? 0,
          email:     (emailDisRes as any).count ?? 0,
          rmktSms:   (rmktSmsDisRes as any).count ?? 0,
          rmktEmail: (rmktEmailDisRes as any).count ?? 0,
        }

        const vendasRaw:  Record<SaleCategory, number> = { sms: 0, email: 0, rmktSms: 0, rmktEmail: 0 }
        const receitaRaw: Record<SaleCategory, number> = { sms: 0, email: 0, rmktSms: 0, rmktEmail: 0 }
        ;((salesRes.data ?? []) as any[]).forEach((r) => {
          const cat = classifyUtm(r.utm_source)
          if (!cat) return
          vendasRaw[cat]++
          receitaRaw[cat] += parseDollar(r['($)'])
        })

        // Aplica o filtro de canal: categorias inativas viram 0
        const pick = (raw: Record<SaleCategory, number>): Record<SaleCategory, number> => ({
          sms:       active.has('sms')       ? raw.sms       : 0,
          email:     active.has('email')     ? raw.email     : 0,
          rmktSms:   active.has('rmktSms')   ? raw.rmktSms   : 0,
          rmktEmail: active.has('rmktEmail') ? raw.rmktEmail : 0,
        })
        const sum = (b: Record<SaleCategory, number>) => CATEGORIES.reduce((acc, c) => acc + b[c], 0)

        const disparos = pick(disparosRaw)
        const vendas   = pick(vendasRaw)
        const receita  = pick(receitaRaw)

        const totalDisparos = sum(disparos)
        const totalVendas   = sum(vendas)
        const totalReceita  = sum(receita)

        const ticket = (v: number, r: number) => (v > 0 ? r / v : 0)
        const taxa   = (v: number, base: number) => (base > 0 ? (v / base) * 100 : 0)

        // 13% sobre a receita total (recuperada + RMKT) permitida pelo filtro
        const comissao = totalReceita * 0.13

        const frontSales  = (frontRes.data ?? []) as any[]
        const frontTotal  = frontSales.reduce((acc, r) => acc + parseDollar(r['($)']), 0)
        const faturamentoPct = frontTotal > 0 ? (totalReceita / frontTotal) * 100 : 0

        setMetrics({
          carrinhosAbandonados,
          disparosFeitos:    { total: totalDisparos, ...disparos },
          vendasRecuperadas: { total: totalVendas,   ...vendas },
          receitaRecuperada: { total: totalReceita,  ...receita },
          ticketMedio: {
            total:     ticket(totalVendas,      totalReceita),
            sms:       ticket(vendas.sms,       receita.sms),
            email:     ticket(vendas.email,     receita.email),
            rmktSms:   ticket(vendas.rmktSms,   receita.rmktSms),
            rmktEmail: ticket(vendas.rmktEmail, receita.rmktEmail),
          },
          // Base da taxa: carrinhos abandonados do canal (RMKT reaborda os mesmos leads)
          taxaConversao: {
            total:     taxa(totalVendas,      cartTotal),
            sms:       taxa(vendas.sms,       cartSms),
            email:     taxa(vendas.email,     cartEmail),
            rmktSms:   taxa(vendas.rmktSms,   cartSms),
            rmktEmail: taxa(vendas.rmktEmail, cartEmail),
          },
          comissaoLumix: comissao,
          faturamentoSobFrontPct: faturamentoPct,
        })
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Erro ao buscar dados')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, chKey])

  return { metrics, loading, error }
}

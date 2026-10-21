import { createFileRoute } from "@tanstack/react-router";
import { Send, TrendingUp, Target, Receipt, DollarSign, Wallet, ShoppingCart, BadgeDollarSign } from "lucide-react";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { RecoveryChart } from "@/components/RecoveryChart";
import { LeadsTable } from "@/components/LeadsTable";
import { CostsModal } from "@/components/CostsModal";
import { useMetrics, type Breakdown } from "@/hooks/useMetrics";
import { useFilters, getActiveCategories, type SaleCategory } from "@/hooks/useFilters";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Lumix Recovery" },
      { name: "description", content: "Métricas de recuperação de vendas em tempo real." },
    ],
  }),
  component: DashboardPage,
});

/**
 * Sub-linhas de breakdown de um card:
 *   SMS: X | Email: Y
 *   RMKT — SMS: X | Email: Y
 * Uma linha é ocultada quando todos os seus valores são 0 ou quando é irrelevante pro filtro.
 */
function BreakdownSub({
  b,
  active,
  fmt,
}: {
  b: Breakdown;
  active: Set<SaleCategory>;
  fmt: (v: number) => string;
}) {
  const rel1 = active.has("sms") || active.has("email");
  const rel2 = active.has("rmktSms") || active.has("rmktEmail");
  const has1 = b.sms > 0 || b.email > 0;
  const has2 = b.rmktSms > 0 || b.rmktEmail > 0;

  // Se nenhuma linha tem valores, mostra as relevantes (zeradas) pra não deixar o card vazio
  const show1 = rel1 && (has1 || !has2);
  const show2 = rel2 && (has2 || !has1);

  const line1 = [
    active.has("sms")   ? `SMS: ${fmt(b.sms)}`     : null,
    active.has("email") ? `Email: ${fmt(b.email)}` : null,
  ].filter(Boolean).join(" | ");

  const line2 = [
    active.has("rmktSms")   ? `SMS: ${fmt(b.rmktSms)}`     : null,
    active.has("rmktEmail") ? `Email: ${fmt(b.rmktEmail)}` : null,
  ].filter(Boolean).join(" | ");

  if (!show1 && !show2) return null;

  return (
    <div className="space-y-0.5">
      {show1 && <div>{line1}</div>}
      {show2 && <div>RMKT — {line2}</div>}
    </div>
  );
}

function DashboardPage() {
  const [costsOpen, setCostsOpen] = useState(false);
  const { metrics: m, loading } = useMetrics();
  const { channels } = useFilters();
  const active = getActiveCategories(channels);

  const pct1 = (v: number) => formatPercent(v, 1);

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <MetricCard
            label="Carrinhos Abandonados"
            icon={ShoppingCart}
            loading={loading}
            value={formatNumber(m.carrinhosAbandonados)}
            subInfo="Leads únicos no período"
          />
          <MetricCard
            label="Disparos Feitos"
            icon={Send}
            loading={loading}
            value={formatNumber(m.disparosFeitos.total)}
            subInfo={<BreakdownSub b={m.disparosFeitos} active={active} fmt={formatNumber} />}
          />
          <MetricCard
            label="Vendas Recuperadas"
            icon={TrendingUp}
            variant="brand"
            loading={loading}
            value={formatNumber(m.vendasRecuperadas.total)}
            subInfo={<BreakdownSub b={m.vendasRecuperadas} active={active} fmt={formatNumber} />}
          />
          <MetricCard
            label="Taxa de Conversão"
            icon={Target}
            loading={loading}
            value={formatPercent(m.taxaConversao.total, 1)}
            subInfo={<BreakdownSub b={m.taxaConversao} active={active} fmt={pct1} />}
          />
          <MetricCard
            label="Ticket Médio"
            icon={Receipt}
            loading={loading}
            value={formatCurrency(m.ticketMedio.total)}
            subInfo={<BreakdownSub b={m.ticketMedio} active={active} fmt={formatCurrency} />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MetricCard
            label="Valor Recuperado"
            icon={BadgeDollarSign}
            variant="brand"
            loading={loading}
            value={formatCurrency(m.receitaRecuperada.total)}
            subInfo={<BreakdownSub b={m.receitaRecuperada} active={active} fmt={formatCurrency} />}
          />
          <MetricCard
            label="Comissão Lumix"
            icon={DollarSign}
            variant="brand2"
            loading={loading}
            value={formatCurrency(m.comissaoLumix)}
            subInfo="13% sobre receita recuperada + remarketing no período"
          />
          <MetricCard
            label="Faturamento Sob o Front"
            icon={Wallet}
            loading={loading}
            value={formatPercent(m.faturamentoSobFrontPct, 2)}
            subInfo="Recuperado + remarketing vs. faturamento do front orgânico"
            editable
            onEdit={() => setCostsOpen(true)}
          />
        </div>

        <RecoveryChart />
        <LeadsTable />
      </div>

      <CostsModal open={costsOpen} onClose={() => setCostsOpen(false)} />
    </AppLayout>
  );
}

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartData } from "@/hooks/useChartData";

const SMS_COLOR   = "#80d7f8";
const EMAIL_COLOR = "#e65ff5";

// Converte "YYYY-MM-DD" para string legível SEM usar parseISO (evita bug de timezone)
function formatDateLabel(dateStr: string, includeYear = false): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day) // construtor local, sem UTC
  if (includeYear) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: '2-digit', year: 'numeric'
    }).format(date)
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: '2-digit'
  }).format(date)
}

const formatUSD = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const SERIES = [
  { key: "sms",       valueKey: "smsValue",       name: "SMS",        color: SMS_COLOR,   dashed: false },
  { key: "email",     valueKey: "emailValue",     name: "Email",      color: EMAIL_COLOR, dashed: false },
  { key: "rmktSms",   valueKey: "rmktSmsValue",   name: "RMKT SMS",   color: SMS_COLOR,   dashed: true  },
  { key: "rmktEmail", valueKey: "rmktEmailValue", name: "RMKT Email", color: EMAIL_COLOR, dashed: true  },
] as const;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload ?? {};

  // Só mostra séries plotadas e com valor definido (RMKT antes da 1ª venda fica undefined)
  const rows = SERIES
    .map((s) => {
      const entry = payload.find((p: any) => p.dataKey === s.key);
      if (!entry || entry.value === null || entry.value === undefined) return null;
      return { ...s, count: entry.value as number, revenue: (data[s.valueKey] as number) ?? 0 };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return null;

  const total = rows.reduce((acc, r) => acc + r.revenue, 0);

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-xs shadow-lg min-w-[180px]">
      <p className="mb-2.5 text-[#666] font-medium">{label ? formatDateLabel(label, true) : ''}</p>

      {rows.map((r) => (
        <div key={r.key} className="mb-1.5">
          <div className="flex items-center justify-between gap-4">
            <span style={{ color: r.color }}>
              {r.dashed ? "┄" : "●"} {r.name}
            </span>
            <span className="text-white font-semibold">{r.count} vendas</span>
          </div>
          <div className="flex justify-end">
            <span className="font-medium" style={{ color: r.color }}>{formatUSD(r.revenue)}</span>
          </div>
        </div>
      ))}

      <div className="mt-2 pt-2 border-t border-[#2a2a2a] flex items-center justify-between">
        <span className="text-[#555]">Total</span>
        <span className="text-white font-semibold">{formatUSD(total)}</span>
      </div>
    </div>
  );
}

export function RecoveryChart() {
  const { data, loading, active } = useChartData();

  if (loading) {
    return (
      <div className="surface-panel p-6">
        <div className="h-4 w-48 rounded animate-pulse bg-white/[0.04] mb-2" />
        <div className="h-3 w-64 rounded animate-pulse bg-white/[0.03] mb-5" />
        <div className="h-[220px] w-full rounded animate-pulse bg-white/[0.03]" />
      </div>
    );
  }

  const showSms       = active.has("sms");
  const showEmail     = active.has("email");
  const showRmktSms   = active.has("rmktSms");
  const showRmktEmail = active.has("rmktEmail");

  return (
    <div className="surface-panel p-6">
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Recuperações ao longo do tempo
          </h2>
          <p className="text-xs text-[#555] mt-1">
            Vendas recuperadas por dia, separadas por canal
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          {showSms       && <LegendDot color={SMS_COLOR}   label="SMS" />}
          {showEmail     && <LegendDot color={EMAIL_COLOR} label="Email" />}
          {showRmktSms   && <LegendDot color={SMS_COLOR}   label="RMKT SMS"   dashed />}
          {showRmktEmail && <LegendDot color={EMAIL_COLOR} label="RMKT Email" dashed />}
        </div>
      </div>

      <div style={{ width: "100%", height: typeof window !== "undefined" && window.innerWidth < 768 ? 160 : 220 }}>
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 8, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="smsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SMS_COLOR} stopOpacity={0.18} />
                <stop offset="100%" stopColor={SMS_COLOR} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="emailFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={EMAIL_COLOR} stopOpacity={0.18} />
                <stop offset="100%" stopColor={EMAIL_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#1a1a1a"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              stroke="#444"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                try { return formatDateLabel(v) } catch { return v }
              }}
            />
            <YAxis
              stroke="#444"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "#2a2a2a", strokeWidth: 1 }}
            />
            {showSms && (
              <Area
                type="monotone"
                dataKey="sms"
                name="SMS"
                stroke={SMS_COLOR}
                strokeWidth={2}
                fill="url(#smsFill)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            )}
            {showEmail && (
              <Area
                type="monotone"
                dataKey="email"
                name="Email"
                stroke={EMAIL_COLOR}
                strokeWidth={2}
                fill="url(#emailFill)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            )}
            {showRmktSms && (
              <Line
                type="monotone"
                dataKey="rmktSms"
                name="RMKT SMS"
                stroke={SMS_COLOR}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
            {showRmktEmail && (
              <Line
                type="monotone"
                dataKey="rmktEmail"
                name="RMKT Email"
                stroke={EMAIL_COLOR}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {dashed ? (
        <span
          className="inline-block h-0 w-3.5"
          style={{ borderTop: `2px dashed ${color}` }}
        />
      ) : (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: color }}
        />
      )}
      <span className="text-xs text-[#888]">{label}</span>
    </div>
  );
}

import { Calendar, Check, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useFilters, type ChannelOption } from "@/hooks/useFilters";

interface PageHeaderProps {
  title: string;
  showFilters?: boolean;
}

const QUICK_RANGES = [
  { key: 'hoje',  label: 'Hoje'       },
  { key: 'ontem', label: 'Ontem'      },
  { key: '7d',    label: '7 dias'     },
  { key: 'mes',   label: 'Este mês'   },
] as const;

const CHANNEL_OPTIONS: ChannelOption[] = ['SMS', 'Email', 'Remarketing'];

function channelLabel(channels: ChannelOption[]): string {
  if (channels.length === 0) return 'Todos';
  if (channels.length <= 2) return channels.join(', ');
  return `${channels.slice(0, 2).join(', ')} +${channels.length - 2}`;
}

export function PageHeader({ title, showFilters = true }: PageHeaderProps) {
  const { dateFrom, dateTo, channels, activeRange, applyCustom, toggleChannel, clearChannels, setRange } = useFilters();

  const [channelOpen, setChannelOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(dateFrom);
  const [customTo, setCustomTo] = useState(dateTo);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const isAll = channels.length === 0;

  function handleApplyCustom() {
    applyCustom(customFrom, customTo);
    setCustomOpen(false);
  }

  const filterContent = (
    <div className="flex items-center gap-2 flex-wrap">
      {QUICK_RANGES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setRange(key)}
          className={[
            "h-9 px-3 text-xs font-medium rounded-md border transition-colors duration-150",
            activeRange === key
              ? "bg-[rgba(128,215,248,0.12)] border-[#80d7f8] text-[#80d7f8]"
              : "bg-[#111] border-[#222] text-[#777] hover:text-[#ccc] hover:border-[#2a2a2a]",
          ].join(" ")}
        >
          {label}
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setCustomOpen((v) => !v)}
          className={[
            "h-9 flex items-center gap-1.5 px-3 text-xs font-medium rounded-md border transition-colors duration-150",
            activeRange === 'custom'
              ? "bg-[rgba(128,215,248,0.12)] border-[#80d7f8] text-[#80d7f8]"
              : "bg-[#111] border-[#222] text-[#777] hover:text-[#ccc] hover:border-[#2a2a2a]",
          ].join(" ")}
        >
          <Calendar size={12} />
          Customizado
          {customOpen
            ? <ChevronUp size={11} className="text-[#555]" />
            : <ChevronDown size={11} className="text-[#555]" />}
        </button>

        {customOpen && (
          <div className="absolute right-0 mt-1.5 w-[280px] rounded-xl bg-[#0f0f0f] border border-[#1e1e1e] p-4 shadow-xl z-50">
            <p className="text-[11px] text-[#555] uppercase tracking-wide mb-3">Período personalizado</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] text-[#666] mb-1 block">De</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] text-[#ccc] text-xs outline-none focus:border-[#80d7f8] [color-scheme:dark] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#666] mb-1 block">Até</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] text-[#ccc] text-xs outline-none focus:border-[#80d7f8] [color-scheme:dark] transition-colors"
                />
              </div>
              <button
                onClick={handleApplyCustom}
                className="w-full h-9 rounded-lg bg-[#80d7f8] text-black text-xs font-bold hover:bg-[#a8e8ff] transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setChannelOpen((v) => !v)}
          className={[
            "h-9 flex items-center gap-2 px-3.5 rounded-lg border text-sm transition-colors",
            isAll
              ? "bg-[#111] border-[#222] text-[#ccc] hover:border-[#2a2a2a]"
              : "bg-[rgba(128,215,248,0.12)] border-[#80d7f8] text-[#80d7f8]",
          ].join(" ")}
        >
          <span className={isAll ? "text-[#666] text-xs" : "text-[#80d7f8]/70 text-xs"}>Canal:</span>
          <span className="text-xs whitespace-nowrap">{channelLabel(channels)}</span>
          <ChevronDown size={12} className={isAll ? "text-[#666]" : "text-[#80d7f8]/70"} />
        </button>
        {channelOpen && (
          <div className="absolute right-0 mt-1.5 w-44 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] py-1 shadow-lg z-50">
            <button
              onClick={() => { clearChannels(); setChannelOpen(false); }}
              className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-sm text-[#ccc] hover:bg-[#161616] transition-colors"
            >
              <span
                className={[
                  "flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border",
                  isAll ? "bg-[#80d7f8] border-[#80d7f8] text-black" : "border-[#333]",
                ].join(" ")}
              >
                {isAll && <Check size={10} strokeWidth={3} />}
              </span>
              Todos
            </button>
            <div className="my-1 h-px bg-[#1a1a1a]" />
            {CHANNEL_OPTIONS.map((c) => {
              const checked = channels.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleChannel(c)}
                  className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-sm text-[#ccc] hover:bg-[#161616] transition-colors"
                >
                  <span
                    className={[
                      "flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border",
                      checked ? "bg-[#80d7f8] border-[#80d7f8] text-black" : "border-[#333]",
                    ].join(" ")}
                  >
                    {checked && <Check size={10} strokeWidth={3} />}
                  </span>
                  {c}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-[#141414] bg-black/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        <h1 className="text-[15px] font-semibold text-white">{title}</h1>

        {showFilters && (
          <>
            <div className="hidden md:flex items-center gap-2">
              {filterContent}
            </div>

            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex md:hidden items-center gap-1.5 h-8 px-3 rounded-lg bg-[#111] border border-[#222] text-[#aaa] text-xs"
            >
              <SlidersHorizontal size={13} />
              Filtros
            </button>
          </>
        )}
      </div>

      {showFilters && filtersOpen && (
        <div className="flex md:hidden flex-col gap-3 px-4 pb-4 border-t border-[#0f0f0f] pt-3">
          {filterContent}
        </div>
      )}
    </header>
  );
}

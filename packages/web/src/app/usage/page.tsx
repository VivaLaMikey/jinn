"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageLayout } from "@/components/page-layout";
import { useBreadcrumbs } from "@/context/breadcrumb-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Gauge, RefreshCw, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WindowUsage {
  utilization: number;
  resetsAt: string | null;
  pacingExceeded?: boolean;
  nearLimit?: boolean;
}

interface ExtraUsage {
  isEnabled: boolean;
  monthlyLimit: number;
  usedCredits: number;
  utilization: number;
}

interface UsageResponse {
  fiveHour?: WindowUsage | null;
  sevenDay?: WindowUsage | null;
  sevenDaySonnet?: WindowUsage | null;
  extraUsage?: ExtraUsage | null;
  fetchedAt?: number;
  shouldThrottle?: boolean;
  status?: string;
  error?: string | null;
  // Legacy fallback
  utilization?: number;
  resetsAt?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usageColor(pct: number): string {
  if (pct < 50) return "var(--system-green)";
  if (pct < 75) return "var(--system-orange, #f59e0b)";
  return "var(--system-red, #ef4444)";
}

function formatReset(resetsAt: string | null): string {
  if (!resetsAt) return "—";
  const diff = new Date(resetsAt).getTime() - Date.now();
  if (diff <= 0) return "resetting…";
  const mins = Math.round(diff / 60_000);
  if (mins >= 1440) return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

function formatFetchedAt(fetchedAt: number | undefined): string {
  if (!fetchedAt) return "—";
  return new Date(fetchedAt).toLocaleTimeString();
}

// ---------------------------------------------------------------------------
// Utilisation gauge (horizontal bar)
// ---------------------------------------------------------------------------

function UtilBar({
  label,
  sublabel,
  pct,
  resetsAt,
  warn,
}: {
  label: string;
  sublabel?: string;
  pct: number;
  resetsAt: string | null;
  warn?: boolean;
}) {
  const color = usageColor(pct);
  const clamped = Math.min(pct, 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-[length:var(--text-body)] font-[var(--weight-semibold)] text-[var(--text-primary)]">
            {label}
          </span>
          {sublabel && (
            <span className="ml-2 text-[length:var(--text-caption1)] text-[var(--text-tertiary)]">
              {sublabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {warn && (
            <AlertTriangle
              size={14}
              style={{ color: "var(--system-orange, #f59e0b)" }}
            />
          )}
          <span
            className="text-[length:var(--text-title3)] font-[var(--weight-semibold)] tabular-nums"
            style={{ color }}
          >
            {Math.round(pct)}%
          </span>
        </div>
      </div>

      {/* Track */}
      <div className="relative h-3 overflow-hidden rounded-full bg-[var(--fill-tertiary)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>

      <div className="flex justify-between text-[length:var(--text-caption2)] text-[var(--text-quaternary)]">
        <span>Resets in {formatReset(resetsAt)}</span>
        <span>{clamped === 100 ? "Limit reached" : `${100 - Math.round(pct)}% remaining`}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip for the bar chart
// ---------------------------------------------------------------------------

function UsageTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const pct = payload[0].value;
  return (
    <div
      className="rounded-[var(--radius-md,12px)] border border-[var(--separator)] px-3 py-2 text-[length:var(--text-caption1)] shadow-md"
      style={{ background: "var(--bg-secondary)" }}
    >
      <p className="font-[var(--weight-semibold)] text-[var(--text-primary)]">{label}</p>
      <p style={{ color: usageColor(pct) }}>{Math.round(pct)}% utilisation</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simulated 7-day trend from available data
// ---------------------------------------------------------------------------

function SevenDayChart({ sevenDay }: { sevenDay: WindowUsage }) {
  // We only have the current utilisation for the 7-day window — the API
  // doesn't return a daily breakdown. We render what we have as a single
  // reference bar alongside placeholder empty bars for prior days.
  const today = new Date();
  const data = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const isToday = i === 6;
    return {
      day: d.toLocaleDateString("en-GB", { weekday: "short" }),
      pct: isToday ? sevenDay.utilization : null,
    };
  });

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tick={{
              fontSize: 11,
              fill: "var(--text-quaternary)",
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--text-quaternary)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<UsageTooltip />} cursor={{ fill: "var(--fill-secondary)" }} />
          <ReferenceLine y={75} stroke="var(--system-orange, #f59e0b)" strokeDasharray="4 3" strokeWidth={1} />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.pct !== null
                    ? usageColor(entry.pct)
                    : "var(--fill-tertiary)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extra (pay-as-you-go) usage card
// ---------------------------------------------------------------------------

function ExtraUsageCard({ extra }: { extra: ExtraUsage }) {
  if (!extra.isEnabled) return null;
  const color = usageColor(extra.utilization);
  const used = extra.usedCredits.toFixed(2);
  const limit = extra.monthlyLimit.toFixed(2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[length:var(--text-body)]">
          Extra Usage (Pay-as-you-go)
        </CardTitle>
        <CardDescription>Monthly spend cap</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[length:var(--text-caption1)] text-[var(--text-secondary)]">
          <span>${used} used</span>
          <span>${limit} limit</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-[var(--fill-tertiary)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(extra.utilization, 100)}%`, background: color }}
          />
        </div>
        <p
          className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] text-right"
          style={{ color }}
        >
          {Math.round(extra.utilization)}% of monthly cap
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UsagePage() {
  useBreadcrumbs([{ label: "Usage" }]);

  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchUsage() {
    try {
      setLoading(true);
      const res = await api.getUsage();
      setData(res as UsageResponse);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 3 * 60_000);
    return () => clearInterval(interval);
  }, []);

  // Normalise: handle both new and legacy API shapes
  const fiveHour =
    data?.fiveHour ??
    (data?.utilization !== undefined
      ? { utilization: data.utilization, resetsAt: data.resetsAt ?? null }
      : null);
  const sevenDay = data?.sevenDay ?? null;
  const sevenDaySonnet = data?.sevenDaySonnet ?? null;
  const extraUsage = data?.extraUsage ?? null;
  const unavailable = data?.status === "unavailable";

  return (
    <PageLayout>
      <div className="h-full overflow-y-auto p-[var(--space-6)]">
        {/* Header */}
        <div className="mb-[var(--space-6)] flex items-start justify-between">
          <div>
            <h2 className="text-[length:var(--text-title2)] font-[var(--weight-bold)] text-[var(--text-primary)] mb-[var(--space-1)]">
              Usage
            </h2>
            <p className="text-[length:var(--text-body)] text-[var(--text-tertiary)]">
              Claude API utilisation across rate-limit windows
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data?.fetchedAt && (
              <span className="text-[length:var(--text-caption1)] text-[var(--text-quaternary)]">
                Updated {formatFetchedAt(data.fetchedAt)}
              </span>
            )}
            <button
              onClick={fetchUsage}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm,8px)] bg-[var(--fill-secondary)] px-3 py-1.5 text-[length:var(--text-caption1)] font-[var(--weight-medium)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--fill-tertiary)] disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div
            className="mb-[var(--space-4)] rounded-[var(--radius-md,12px)] border px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-body)] text-[var(--system-red)]"
            style={{
              background: "color-mix(in srgb, var(--system-red) 10%, transparent)",
              borderColor: "color-mix(in srgb, var(--system-red) 30%, transparent)",
            }}
          >
            Failed to load usage data: {error}
          </div>
        )}

        {/* Throttle warning */}
        {data?.shouldThrottle && (
          <div
            className="mb-[var(--space-4)] flex items-center gap-2 rounded-[var(--radius-md,12px)] border px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-body)]"
            style={{
              background: "color-mix(in srgb, var(--system-orange, #f59e0b) 10%, transparent)",
              borderColor: "color-mix(in srgb, var(--system-orange, #f59e0b) 30%, transparent)",
              color: "var(--system-orange, #f59e0b)",
            }}
          >
            <AlertTriangle size={16} />
            Usage is pacing ahead of limit — consider throttling new sessions.
          </div>
        )}

        {/* Unavailable */}
        {unavailable && !error && (
          <Card>
            <CardContent className="py-10 text-center text-[length:var(--text-body)] text-[var(--text-tertiary)]">
              <Gauge size={32} className="mx-auto mb-3 opacity-30" />
              Usage data is not available. The usage poller may not be running.
            </CardContent>
          </Card>
        )}

        {/* Main content */}
        {!unavailable && (
          <div className="flex flex-col gap-[var(--space-4)]">
            {/* 5-hour window */}
            {fiveHour && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[length:var(--text-body)]">
                    5-Hour Window
                  </CardTitle>
                  <CardDescription>
                    Short-term rate-limit window — resets every 5 hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UtilBar
                    label="Current utilisation"
                    pct={fiveHour.utilization}
                    resetsAt={fiveHour.resetsAt}
                    warn={fiveHour.pacingExceeded || fiveHour.nearLimit}
                  />
                </CardContent>
              </Card>
            )}

            {/* 7-day window */}
            {sevenDay && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[length:var(--text-body)]">
                    7-Day Window
                  </CardTitle>
                  <CardDescription>
                    Weekly rate-limit window — resets every 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <UtilBar
                    label="Current utilisation"
                    pct={sevenDay.utilization}
                    resetsAt={sevenDay.resetsAt}
                    warn={sevenDay.pacingExceeded || sevenDay.nearLimit}
                  />
                  <div>
                    <p className="mb-2 text-[length:var(--text-caption1)] font-[var(--weight-medium)] text-[var(--text-tertiary)] uppercase tracking-[0.05em]">
                      7-day trend
                    </p>
                    <SevenDayChart sevenDay={sevenDay} />
                    <p className="mt-1 text-[length:var(--text-caption2)] text-[var(--text-quaternary)]">
                      Historical daily breakdown not yet available from the API — showing today's utilisation only.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 7-day Sonnet-specific window */}
            {sevenDaySonnet && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[length:var(--text-body)]">
                    7-Day Window (Sonnet)
                  </CardTitle>
                  <CardDescription>
                    Sonnet model-specific weekly limit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UtilBar
                    label="Current utilisation"
                    pct={sevenDaySonnet.utilization}
                    resetsAt={sevenDaySonnet.resetsAt}
                  />
                </CardContent>
              </Card>
            )}

            {/* Extra (PAYG) usage */}
            {extraUsage && <ExtraUsageCard extra={extraUsage} />}

            {/* Loading skeleton when no data yet */}
            {loading && !fiveHour && !sevenDay && (
              <Card>
                <CardContent className="py-10 text-center text-[length:var(--text-body)] text-[var(--text-tertiary)]">
                  <RefreshCw size={24} className="mx-auto mb-2 animate-spin opacity-40" />
                  Loading usage data…
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

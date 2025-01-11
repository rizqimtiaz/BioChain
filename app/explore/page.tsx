"use client";

/**
 * BioChain – /explore
 * The marketplace of active clinical-trial IP-NFTs available for funding.
 *
 * Sections:
 *   1. Filter / search rail (therapeutic area, phase, trust threshold)
 *   2. Aggregated charts: milestone-progress (bar) and funding velocity (area)
 *   3. Therapeutic-area distribution (pie)
 *   4. Grid of TrialCard components, each with invest / sign affordances
 */

import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  ShieldCheck,
  TrendingUp,
  X,
  SortAsc,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useBioStore,
  selectFilteredTrials,
  THERAPEUTIC_AREAS,
  TRIAL_PHASES,
  type TherapeuticArea,
  type TrialPhase,
} from "@/store/useBioStore";
import { TrialCard } from "@/components/TrialCard";
import { cn, formatEth } from "@/lib/bio-utils";

type SortKey = "trust" | "raised" | "newest";

const PIE_COLORS = [
  "#1e40af",
  "#1d4ed8",
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
  "#475569",
  "#64748b",
  "#94a3b8",
  "#cbd5e1",
];

export default function ExplorePage() {
  const baseTrials = useBioStore(selectFilteredTrials);
  const preferredArea = useBioStore((s) => s.preferredArea);
  const showOnlyVerified = useBioStore((s) => s.showOnlyVerified);
  const setPreferredArea = useBioStore((s) => s.setPreferredArea);
  const toggleVerifiedOnly = useBioStore((s) => s.toggleVerifiedOnly);

  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<TrialPhase | "All">("All");
  const [sort, setSort] = useState<SortKey>("trust");

  // ── Apply local filters / sort over store-filtered list ────────────────
  const trials = useMemo(() => {
    let list = baseTrials;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.institution.toLowerCase().includes(q) ||
          t.therapeuticArea.toLowerCase().includes(q),
      );
    }
    if (phaseFilter !== "All") {
      list = list.filter((t) => t.phase === phaseFilter);
    }
    list = [...list].sort((a, b) => {
      if (sort === "trust") return b.trustScore - a.trustScore;
      if (sort === "raised") return b.raisedEth - a.raisedEth;
      return b.createdAt - a.createdAt;
    });
    return list;
  }, [baseTrials, query, phaseFilter, sort]);

  // ── Derived chart data ─────────────────────────────────────────────────
  const milestoneChartData = useMemo(
    () =>
      trials.slice(0, 8).map((t) => {
        const released = t.milestones.filter((m) => m.released).length;
        const pending = t.milestones.length - released;
        return {
          name: `#${t.tokenId}`,
          fullTitle: t.title,
          Released: released,
          Pending: pending,
        };
      }),
    [trials],
  );

  const fundingVelocityData = useMemo(() => {
    // Synthesize a 12-week funding velocity from current snapshot — keeps
    // the demo deterministic without server data.
    const totalRaised = trials.reduce((acc, t) => acc + t.raisedEth, 0);
    const totalGoal = trials.reduce((acc, t) => acc + t.fundingGoalEth, 0);
    const weeks = 12;
    const series: { week: string; raised: number; goal: number }[] = [];
    let raisedAcc = 0;
    let goalAcc = 0;
    for (let i = 0; i < weeks; i++) {
      const t = (i + 1) / weeks;
      raisedAcc = totalRaised * (1 - Math.pow(1 - t, 2.2));
      goalAcc = totalGoal * t;
      series.push({
        week: `W${i + 1}`,
        raised: +raisedAcc.toFixed(1),
        goal: +goalAcc.toFixed(1),
      });
    }
    return series;
  }, [trials]);

  const areaDistribution = useMemo(() => {
    const map = new Map<TherapeuticArea, number>();
    for (const t of trials) {
      map.set(t.therapeuticArea, (map.get(t.therapeuticArea) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [trials]);

  // ── Aggregate KPIs ─────────────────────────────────────────────────────
  const aggregate = useMemo(() => {
    const raised = trials.reduce((acc, t) => acc + t.raisedEth, 0);
    const goal = trials.reduce((acc, t) => acc + t.fundingGoalEth, 0);
    const sigs = trials.reduce((acc, t) => acc + t.verifierSignatures, 0);
    const trust =
      trials.length === 0
        ? 0
        : trials.reduce((acc, t) => acc + t.trustScore, 0) / trials.length;
    return { raised, goal, sigs, trust };
  }, [trials]);

  const activeFilters =
    (preferredArea !== "All" ? 1 : 0) +
    (showOnlyVerified ? 1 : 0) +
    (phaseFilter !== "All" ? 1 : 0) +
    (query.trim() ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 lg:px-6 lg:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-clinical text-trust-800">
            <Sparkles className="h-3.5 w-3.5" />
            Marketplace
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 lg:text-3xl">
            Explore Active Clinical Trials
          </h1>
          <p className="text-sm text-slate-600">
            Fund verified research directly. Every trial is anchored on-chain
            with milestone-based fund release and decentralized peer review.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <MiniKpi label="Trials" value={trials.length.toString()} />
          <MiniKpi label="Raised" value={formatEth(aggregate.raised, 0)} />
          <MiniKpi
            label="Goal"
            value={formatEth(aggregate.goal, 0)}
            tone="muted"
          />
          <MiniKpi
            label="Avg. Trust"
            value={`${aggregate.trust.toFixed(0)}/100`}
            tone="trust"
          />
        </div>
      </header>

      {/* Filter rail */}
      <section
        className="surface mb-6 flex flex-col gap-3 p-3 lg:flex-row lg:items-center"
        aria-label="Filters"
      >
        {/* Search */}
        <label className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trials, institutions, therapeutic areas…"
            className="w-full rounded-clinical border border-slate-300 bg-canvas py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-trust-800 focus:outline-none focus:ring-2 focus:ring-trust-800/20"
            aria-label="Search trials"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 rounded-sharp p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>

        {/* Area select */}
        <SelectField
          label="Area"
          value={preferredArea}
          onChange={(v) => setPreferredArea(v as TherapeuticArea | "All")}
          options={["All", ...THERAPEUTIC_AREAS]}
        />

        {/* Phase select */}
        <SelectField
          label="Phase"
          value={phaseFilter}
          onChange={(v) => setPhaseFilter(v as TrialPhase | "All")}
          options={["All", ...TRIAL_PHASES]}
        />

        {/* Sort */}
        <SelectField
          label="Sort"
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          options={["trust", "raised", "newest"]}
          render={(v) =>
            v === "trust"
              ? "Trust score"
              : v === "raised"
                ? "Most raised"
                : "Newest"
          }
          icon={SortAsc}
        />

        {/* Verified only */}
        <button
          type="button"
          onClick={toggleVerifiedOnly}
          aria-pressed={showOnlyVerified}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-clinical border px-3 py-2 text-xs font-semibold transition-colors focus-ring",
            showOnlyVerified
              ? "border-trust-800 bg-trust-50 text-trust-800"
              : "border-slate-300 bg-canvas text-slate-700 hover:bg-slate-100",
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Verified ≥ 50
        </button>

        {activeFilters > 0 && (
          <span className="inline-flex items-center gap-1 self-start rounded-sharp bg-trust-50 px-2 py-0.5 text-2xs font-semibold text-trust-800 lg:self-auto">
            <Filter className="h-3 w-3" />
            {activeFilters} filter{activeFilters === 1 ? "" : "s"}
          </span>
        )}
      </section>

      {/* Charts */}
      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        {/* Milestone progress (bar) */}
        <ChartCard
          title="Milestone Progress"
          subtitle="Released vs pending milestones across listed trials"
          icon={TrendingUp}
          className="lg:col-span-2"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={milestoneChartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 4" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  stroke="#cbd5e1"
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  stroke="#cbd5e1"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelFormatter={(label) => {
                    const item = milestoneChartData.find(
                      (d) => d.name === label,
                    );
                    return item ? item.fullTitle : label;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#475569" }}
                  iconType="square"
                />
                <Bar
                  dataKey="Released"
                  stackId="m"
                  fill="#1e40af"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="Pending"
                  stackId="m"
                  fill="#cbd5e1"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Therapeutic area distribution (pie) */}
        <ChartCard
          title="Therapeutic Distribution"
          subtitle="Listed trials by area"
          icon={Filter}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={areaDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={86}
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {areaDistribution.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-2xs text-slate-600">
            {areaDistribution.map((a, idx) => (
              <li key={a.name} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-sharp"
                  style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <span className="flex-1 truncate">{a.name}</span>
                <span className="font-mono text-slate-500">{a.value}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </section>

      {/* Funding velocity */}
      <section className="mb-8">
        <ChartCard
          title="Funding Velocity (12-Week)"
          subtitle="Cumulative ETH raised vs. cumulative funding goal across the marketplace"
          icon={TrendingUp}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={fundingVelocityData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="raisedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e40af" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1e40af" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 4" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  stroke="#cbd5e1"
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  stroke="#cbd5e1"
                  width={48}
                  tickFormatter={(v) => `${v} ETH`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => `${v.toLocaleString()} ETH`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#475569" }}
                  iconType="square"
                />
                <Area
                  type="monotone"
                  dataKey="goal"
                  name="Goal"
                  stroke="#94a3b8"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  fill="url(#goalFill)"
                />
                <Area
                  type="monotone"
                  dataKey="raised"
                  name="Raised"
                  stroke="#1e40af"
                  strokeWidth={2}
                  fill="url(#raisedFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      {/* Trial grid */}
      <section>
        <header className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {trials.length} Trial{trials.length === 1 ? "" : "s"}
            </h2>
            <p className="text-2xs font-medium uppercase tracking-clinical text-slate-500">
              Sorted by{" "}
              {sort === "trust"
                ? "trust score"
                : sort === "raised"
                  ? "amount raised"
                  : "newest"}
            </p>
          </div>
        </header>

        {trials.length === 0 ? (
          <div className="surface flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Filter className="h-6 w-6 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">
              No trials match the active filters
            </h3>
            <p className="max-w-md text-xs text-slate-500">
              Try widening the therapeutic area, lowering the trust threshold,
              or clearing your search query.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPhaseFilter("All");
                setPreferredArea("All");
                if (showOnlyVerified) toggleVerifiedOnly();
              }}
              className="btn-ghost mt-2"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {trials.map((trial) => (
              <TrialCard key={trial.tokenId} trial={trial} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Internal subcomponents
 * ──────────────────────────────────────────────────────────────────────── */

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  render,
  icon: Icon,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: readonly T[];
  render?: (v: T) => string;
  icon?: typeof SortAsc;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-clinical border border-slate-300 bg-canvas pl-3 pr-1 text-xs">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      <span className="text-2xs font-semibold uppercase tracking-clinical text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="appearance-none border-0 bg-transparent py-2 pr-2 text-xs font-medium text-slate-900 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {render ? render(opt) : opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function MiniKpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "trust" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-clinical border px-3 py-2",
        tone === "trust"
          ? "border-trust-200 bg-trust-50 text-trust-800"
          : tone === "muted"
            ? "border-slate-200 bg-canvas-subtle text-slate-700"
            : "border-slate-200 bg-canvas text-slate-900",
      )}
    >
      <div className="text-2xs font-semibold uppercase tracking-clinical opacity-80">
        {label}
      </div>
      <div className="font-mono text-base tabular-nums">{value}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof TrendingUp;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("surface p-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-sharp bg-trust-50 text-trust-800">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-2xs text-slate-500">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

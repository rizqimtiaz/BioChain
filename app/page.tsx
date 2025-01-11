"use client";

/**
 * BioChain – Overview page (root route)
 * Dashboard landing surface: protocol KPIs, recent IP-NFTs, anchor stream,
 * and quick-access tiles into the marketplace and researcher workflows.
 */

import Link from "next/link";
import { useMemo } from "react";
import {
  ShieldCheck,
  Activity,
  TrendingUp,
  Beaker,
  Microscope,
  ArrowRight,
  Database,
  FileSignature,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useBioStore } from "@/store/useBioStore";
import { TrialCard } from "@/components/TrialCard";
import { cn, formatEth } from "@/lib/bio-utils";

const FLOW_DATA = [
  { day: "Mon", anchored: 1240, signatures: 18 },
  { day: "Tue", anchored: 1620, signatures: 22 },
  { day: "Wed", anchored: 1505, signatures: 19 },
  { day: "Thu", anchored: 1780, signatures: 27 },
  { day: "Fri", anchored: 2010, signatures: 31 },
  { day: "Sat", anchored: 1320, signatures: 12 },
  { day: "Sun", anchored: 980, signatures: 9 },
];

export default function OverviewPage() {
  const trials = useBioStore((s) => s.trials);

  const kpis = useMemo(() => {
    const totalRaised = trials.reduce((acc, t) => acc + t.raisedEth, 0);
    const totalGoal = trials.reduce((acc, t) => acc + t.fundingGoalEth, 0);
    const active = trials.filter((t) => t.status === "Active").length;
    const sigs = trials.reduce((acc, t) => acc + t.verifierSignatures, 0);
    return { totalRaised, totalGoal, active, sigs };
  }, [trials]);

  const featured = useMemo(
    () =>
      [...trials]
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, 3),
    [trials],
  );

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 lg:px-6 lg:py-8">
      {/* Hero */}
      <section className="surface relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-grid-slate bg-grid opacity-60"
        />
        <div className="relative grid gap-6 px-6 py-7 lg:grid-cols-[1.4fr,1fr] lg:px-8 lg:py-9">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-clinical text-trust-800">
              <span className="h-1.5 w-1.5 rounded-full bg-trust-800 animate-pulse-trust" />
              Live Protocol · Sepolia Testnet
            </div>
            <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-slate-900 lg:text-4xl">
              Tokenize research IP. Anchor trial data.
              <br />
              <span className="text-trust-800">Verify with peer review.</span>
            </h1>
            <p className="max-w-2xl text-pretty text-sm text-slate-600 lg:text-base">
              BioChain is the decentralized clinical trial network. Researchers
              mint trials as ERC-1155 IP-NFTs, fund them through fractional
              shares, anchor wearable & lab data on-chain, and earn credibility
              from a federation of verifier laboratories.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/explore" className="btn-primary">
                Explore Trials
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/lab/mint" className="btn-ghost">
                <FileSignature className="h-4 w-4" />
                Mint a Trial IP-NFT
              </Link>
            </div>
          </div>

          {/* Mini chart */}
          <div className="rounded-clinical border border-slate-200 bg-canvas-subtle p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-2xs font-semibold uppercase tracking-clinical text-slate-500">
                  Last 7 Days
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  Data anchors & verifier signatures
                </div>
              </div>
              <span className="rounded-sharp bg-trust-50 px-2 py-0.5 text-2xs font-semibold text-trust-800">
                +18.4%
              </span>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={FLOW_DATA}>
                  <defs>
                    <linearGradient id="anchorFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e40af" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1e40af" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    stroke="#cbd5e1"
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    stroke="#cbd5e1"
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="anchored"
                    stroke="#1e40af"
                    strokeWidth={2}
                    fill="url(#anchorFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={TrendingUp}
          label="Total Raised"
          value={formatEth(kpis.totalRaised, 0)}
          sub={`Across ${trials.length} trials`}
        />
        <Kpi
          icon={Activity}
          label="Active Trials"
          value={kpis.active.toString()}
          sub="Funded · in progress"
          tone="success"
        />
        <Kpi
          icon={ShieldCheck}
          label="Peer Signatures"
          value={kpis.sigs.toString()}
          sub="Verifier laboratories"
          tone="trust"
        />
        <Kpi
          icon={Database}
          label="Data Anchors / 7d"
          value="11.4k"
          sub="SHA-256 hashes on-chain"
        />
      </section>

      {/* Quick access tiles */}
      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <Tile
          href="/explore"
          icon={TrendingUp}
          title="Invest in Research"
          description="Buy fractional shares of curated clinical trials. Funds release as milestones complete."
        />
        <Tile
          href="/lab"
          icon={Beaker}
          title="Run a Trial"
          description="Mint your protocol as an IP-NFT, define milestones, and raise from your patient community."
        />
        <Tile
          href="/verify"
          icon={Microscope}
          title="Sign as a Verifier"
          description="Whitelisted laboratories validate findings on-chain — every signature compounds trust."
        />
      </section>

      {/* Featured trials */}
      <section className="mt-8">
        <header className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Highest Trust Score
            </h2>
            <p className="text-xs text-slate-500">
              Top trials by decentralized peer-review signatures
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 text-xs font-semibold text-trust-800 hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {featured.map((t) => (
            <TrialCard key={t.tokenId} trial={t} />
          ))}
        </div>
      </section>

      {/* Activity rail */}
      <section className="mt-8 surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-trust-800" />
            <h2 className="text-sm font-semibold text-slate-900">
              Recent On-Chain Activity
            </h2>
          </div>
          <span className="text-2xs font-semibold uppercase tracking-clinical text-slate-400">
            indexed every block
          </span>
        </div>
        <ul className="divide-y divide-slate-200 text-sm">
          {[
            {
              tag: "ANCHOR",
              text: "0x4f…9c1d anchored 264 wearable readings to IP-NFT #0002",
            },
            {
              tag: "SIGN",
              text: "Verifier Lab 0xBro…8fA signed IP-NFT #0006 (LongLife-7)",
            },
            {
              tag: "MILESTONE",
              text: "ATX-441 milestone 1 released · 24.0 ETH disbursed",
            },
            {
              tag: "INVEST",
              text: "0xC0FFEE…E1 acquired 1,200 shares of IP-NFT #0001",
            },
            {
              tag: "MINT",
              text: "GeneRevive-α1 IP-NFT minted · 36,000 fractional shares",
            },
          ].map((evt) => (
            <li key={evt.text} className="flex items-center gap-3 py-2.5">
              <span
                className={cn(
                  "inline-flex w-20 justify-center rounded-sharp px-1.5 py-0.5 text-2xs font-bold uppercase tracking-clinical ring-1",
                  evt.tag === "ANCHOR" &&
                    "bg-trust-50 text-trust-800 ring-trust-100",
                  evt.tag === "SIGN" &&
                    "bg-clinical-success-soft text-clinical-success ring-emerald-200",
                  evt.tag === "MILESTONE" &&
                    "bg-canvas-muted text-slate-700 ring-slate-200",
                  evt.tag === "INVEST" &&
                    "bg-clinical-warning-soft text-clinical-warning ring-amber-200",
                  evt.tag === "MINT" &&
                    "bg-trust-800 text-white ring-trust-900",
                )}
              >
                {evt.tag}
              </span>
              <span className="font-mono text-xs text-slate-700">
                {evt.text}
              </span>
              <span className="ml-auto text-2xs text-slate-400">
                just now
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "success" | "trust";
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-2xs font-semibold uppercase tracking-clinical text-slate-500">
          {label}
        </span>
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-sharp",
            tone === "trust"
              ? "bg-trust-800 text-white"
              : tone === "success"
                ? "bg-clinical-success-soft text-clinical-success"
                : "bg-canvas-subtle text-slate-600",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </div>
      <div className="text-2xs text-slate-500">{sub}</div>
    </div>
  );
}

function Tile({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group surface flex flex-col gap-2 p-4 transition-colors hover:border-trust-200 hover:bg-canvas focus-ring"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-sharp bg-trust-50 text-trust-800 group-hover:bg-trust-800 group-hover:text-white transition-colors">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-xs text-slate-600">{description}</p>
      <span className="mt-1 inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-clinical text-trust-800">
        Open
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

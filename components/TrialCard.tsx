"use client";

/**
 * BioChain – TrialCard
 * ----------------------------------------------------------------------------
 * A high-density "lab notebook entry" card for a single clinical-trial
 * IP-NFT. Surfaces:
 *   • Title, therapeutic area, phase, on-chain status
 *   • Trust Score (peer-review signatures) with tier
 *   • Funding progress (raised / goal, shares sold)
 *   • Milestone strip with released markers
 *   • Quick actions (View, Invest, Sign — depending on user role)
 */

import { memo, useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  FlaskConical,
  Activity,
  CheckCircle2,
  Circle,
  Hash,
  TrendingUp,
  AlertTriangle,
  Building2,
  ExternalLink,
  Lock,
  ScanLine,
  PenLine,
} from "lucide-react";
import {
  cn,
  formatEth,
  formatPercent,
  shortAddress,
  trustTier,
  type TrustTier,
} from "@/lib/bio-utils";
import {
  useBioStore,
  type TrialSummary,
} from "@/store/useBioStore";

interface TrialCardProps {
  trial: TrialSummary;
  className?: string;
  variant?: "default" | "compact";
  onViewDetails?: (tokenId: number) => void;
}

const phaseColor: Record<string, string> = {
  Preclinical: "bg-slate-100 text-slate-700 ring-slate-200",
  "Phase I": "bg-trust-50 text-trust-800 ring-trust-100",
  "Phase II": "bg-trust-100 text-trust-800 ring-trust-200",
  "Phase III": "bg-trust-800/10 text-trust-800 ring-trust-200",
  "Phase IV": "bg-trust-800 text-white ring-trust-900",
};

const statusBadge: Record<
  string,
  { label: string; classes: string; icon: typeof Activity }
> = {
  Funding: {
    label: "FUNDING",
    classes: "bg-clinical-info-soft text-trust-800 ring-trust-200",
    icon: TrendingUp,
  },
  Active: {
    label: "ACTIVE",
    classes: "bg-clinical-success-soft text-clinical-success ring-emerald-200",
    icon: Activity,
  },
  Completed: {
    label: "COMPLETED",
    classes: "bg-slate-900 text-white ring-slate-900",
    icon: CheckCircle2,
  },
  Cancelled: {
    label: "CANCELLED",
    classes: "bg-clinical-danger-soft text-clinical-danger ring-red-200",
    icon: AlertTriangle,
  },
};

const tierColor: Record<TrustTier, string> = {
  "Gold-Standard": "text-trust-800",
  Validated: "text-trust-700",
  Emerging: "text-slate-600",
  Unverified: "text-slate-400",
};

function TrialCardImpl({
  trial,
  className,
  variant = "default",
  onViewDetails,
}: TrialCardProps) {
  const role = useBioStore((s) => s.role);
  const wallet = useBioStore((s) => s.wallet);
  const buyShares = useBioStore((s) => s.buyShares);
  const signTrial = useBioStore((s) => s.signTrial);

  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [shareInput, setShareInput] = useState<number>(10);

  const tier = trustTier(trial.trustScore);
  const fundingRatio = useMemo(() => {
    if (trial.fundingGoalEth === 0) return 0;
    return Math.min(1, trial.raisedEth / trial.fundingGoalEth);
  }, [trial.fundingGoalEth, trial.raisedEth]);

  const releasedMilestones = trial.milestones.filter((m) => m.released).length;
  const milestoneRatio =
    trial.milestones.length === 0
      ? 0
      : releasedMilestones / trial.milestones.length;

  const Status = statusBadge[trial.status] ?? statusBadge.Funding;
  const StatusIcon = Status.icon;

  const isCompact = variant === "compact";

  function handleInvest() {
    setFeedback(null);
    startTransition(() => {
      const result = buyShares(trial.tokenId, shareInput);
      if (result.ok) {
        setFeedback({
          kind: "success",
          message: `Acquired ${shareInput.toLocaleString()} share${shareInput === 1 ? "" : "s"}.`,
        });
      } else {
        setFeedback({
          kind: "error",
          message: result.reason ?? "Transaction failed.",
        });
      }
    });
  }

  function handleSign() {
    setFeedback(null);
    startTransition(() => {
      signTrial(trial.tokenId);
      setFeedback({
        kind: "success",
        message: "Peer-review signature recorded.",
      });
    });
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-clinical bg-canvas",
        "border border-slate-200 shadow-clinical",
        "transition-all duration-200 ease-clinical",
        "hover:border-trust-200 hover:shadow-clinical-md",
        className,
      )}
      aria-label={`Trial ${trial.title}`}
    >
      {/* Top bar — therapeutic area + tokenId */}
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-canvas-subtle px-5 py-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-clinical text-slate-500">
          <FlaskConical className="h-3.5 w-3.5 text-trust-800" />
          <span>{trial.therapeuticArea}</span>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-slate-500">
            IP-NFT #{trial.tokenId.toString().padStart(4, "0")}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-sharp px-2 py-0.5 text-2xs font-semibold ring-1",
            Status.classes,
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {Status.label}
        </span>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        {/* Title row */}
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "shrink-0 rounded-sharp px-2 py-0.5 text-2xs font-semibold uppercase tracking-clinical ring-1",
              phaseColor[trial.phase] ?? phaseColor.Preclinical,
            )}
          >
            {trial.phase}
          </span>
          <h3 className="text-base font-semibold leading-snug text-slate-900">
            {trial.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate">{trial.institution}</span>
        </div>

        {/* Trust + funding row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Trust score */}
          <div className="rounded-clinical border border-slate-200 bg-canvas-subtle p-3">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-clinical text-slate-500">
                Trust Score
              </span>
              <ShieldCheck
                className={cn(
                  "h-3.5 w-3.5",
                  trial.trustScore >= 50 ? "text-trust-800" : "text-slate-400",
                )}
              />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums text-slate-900">
                {trial.trustScore}
              </span>
              <span className="text-xs text-slate-400">/100</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className={cn("text-2xs font-medium", tierColor[tier])}>
                {tier}
              </span>
              <span className="font-mono text-2xs text-slate-500">
                {trial.verifierSignatures} sig
                {trial.verifierSignatures === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Raised */}
          <div className="rounded-clinical border border-slate-200 bg-canvas-subtle p-3">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-clinical text-slate-500">
                Raised
              </span>
              <Hash className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums text-slate-900">
                {trial.raisedEth.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">
                / {trial.fundingGoalEth.toFixed(0)} ETH
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-2xs font-medium text-slate-600">
                {formatPercent(fundingRatio, 1)}
              </span>
              <span className="font-mono text-2xs text-slate-500">
                {trial.sharesSold.toLocaleString()}/
                {trial.totalShares.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Funding bar */}
        <div>
          <div className="flex items-center justify-between text-2xs font-medium uppercase tracking-clinical text-slate-500">
            <span>Funding Progress</span>
            <span className="font-mono text-slate-700">
              {formatEth(trial.raisedEth, 1)} / {formatEth(trial.fundingGoalEth, 0)}
            </span>
          </div>
          <div
            className="relative mt-1.5 h-2 overflow-hidden rounded-sharp bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fundingRatio * 100)}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(fundingRatio * 100)}%` }}
              transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
              className="absolute inset-y-0 left-0 bg-trust-gradient"
            />
            {trial.status === "Active" && (
              <div className="pointer-events-none absolute inset-0 bg-verified-stripes" />
            )}
          </div>
        </div>

        {/* Milestone strip */}
        {!isCompact && (
          <div>
            <div className="flex items-center justify-between text-2xs font-medium uppercase tracking-clinical text-slate-500">
              <span>Milestones</span>
              <span className="font-mono text-slate-700">
                {releasedMilestones}/{trial.milestones.length} released
              </span>
            </div>
            <ol className="mt-2 flex items-center gap-1">
              {trial.milestones.map((m) => (
                <li
                  key={m.index}
                  className="group/m relative flex-1"
                  title={`${m.released ? "Released" : "Pending"}: ${m.description}`}
                >
                  <div
                    className={cn(
                      "h-1.5 rounded-sharp transition-colors",
                      m.released
                        ? "bg-trust-800"
                        : "bg-slate-200 group-hover/m:bg-slate-300",
                    )}
                  />
                  <div className="mt-1 flex items-center gap-1">
                    {m.released ? (
                      <CheckCircle2 className="h-3 w-3 text-trust-800" />
                    ) : (
                      <Circle className="h-3 w-3 text-slate-300" />
                    )}
                    <span className="line-clamp-1 text-2xs text-slate-500">
                      {m.description}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex items-center justify-between text-2xs text-slate-400">
              <span>
                Milestone progress: {formatPercent(milestoneRatio, 0)}
              </span>
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Funds escrowed on-chain
              </span>
            </div>
          </div>
        )}

        {/* Researcher / metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-slate-500">
          <span className="flex items-center gap-1 font-mono">
            <ScanLine className="h-3 w-3 text-trust-800" />
            Researcher: {shortAddress(trial.researcher)}
          </span>
          <a
            href={trial.metadataURI.replace(
              /^ipfs:\/\//,
              "https://w3s.link/ipfs/",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-500 underline-offset-2 hover:text-trust-800 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Metadata
          </a>
        </div>
      </div>

      {/* Action footer */}
      <footer className="flex flex-col gap-2 border-t border-slate-200 bg-canvas-subtle px-5 py-3">
        {feedback && (
          <div
            className={cn(
              "rounded-sharp px-2 py-1 text-2xs font-medium",
              feedback.kind === "success"
                ? "bg-clinical-success-soft text-clinical-success"
                : "bg-clinical-danger-soft text-clinical-danger",
            )}
            role="status"
          >
            {feedback.message}
          </div>
        )}

        <div className="flex items-center gap-2">
          {trial.status === "Funding" && role !== "researcher" && (
            <div className="flex flex-1 items-center gap-2">
              <label className="sr-only" htmlFor={`shares-${trial.tokenId}`}>
                Shares to purchase
              </label>
              <input
                id={`shares-${trial.tokenId}`}
                type="number"
                min={1}
                step={1}
                value={shareInput}
                onChange={(e) =>
                  setShareInput(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                }
                className="w-20 rounded-sharp border border-slate-300 bg-canvas px-2 py-1.5 text-xs font-mono text-slate-900 focus:border-trust-800 focus:outline-none focus:ring-2 focus:ring-trust-800/20"
                aria-label="Shares"
              />
              <button
                type="button"
                onClick={handleInvest}
                disabled={pending || !wallet}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sharp px-3 py-1.5 text-xs font-semibold transition-colors",
                  "bg-trust-800 text-white hover:bg-trust-900",
                  "disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500",
                )}
                aria-label={`Invest in ${trial.title}`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {pending
                  ? "Processing…"
                  : wallet
                    ? `Invest · ${(shareInput * trial.pricePerShareEth).toFixed(2)} ETH`
                    : "Connect wallet"}
              </button>
            </div>
          )}

          {role === "verifier" && trial.status !== "Cancelled" && (
            <button
              type="button"
              onClick={handleSign}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-sharp border border-trust-800 bg-canvas px-3 py-1.5 text-xs font-semibold text-trust-800 transition-colors hover:bg-trust-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PenLine className="h-3.5 w-3.5" />
              Sign Peer Review
            </button>
          )}

          <button
            type="button"
            onClick={() => onViewDetails?.(trial.tokenId)}
            className="ml-auto inline-flex items-center gap-1 rounded-sharp px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            View details
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </footer>

      {/* Verified watermark for high-trust trials */}
      {trial.trustScore >= 80 && (
        <div
          aria-hidden
          className="pointer-events-none absolute right-3 top-12 flex items-center gap-1 rounded-sharp border border-trust-200 bg-trust-50/80 px-1.5 py-0.5 text-2xs font-bold uppercase tracking-clinical text-trust-800 shadow-clinical"
        >
          <ShieldCheck className="h-3 w-3" />
          Gold-Standard
        </div>
      )}
    </motion.article>
  );
}

export const TrialCard = memo(TrialCardImpl);
export default TrialCard;

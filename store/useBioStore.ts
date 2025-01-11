/**
 * BioChain – Global client store (Zustand)
 * ----------------------------------------------------------------------------
 * Tracks:
 *   • The connected wallet identity and the active "role" (Researcher vs.
 *     Investor) the user is operating under.
 *   • A demo catalog of trials displayed on the marketplace.
 *   • An investor's portfolio of fractional shares.
 *   • Researcher credentials (institution, ORCID, verifier-lab status).
 *
 * The store is intentionally hydration-safe: no Date.now() or random IDs are
 * created in the initializer — they are computed lazily inside actions only.
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  TRIAL_PHASES,
  TRIAL_STATUSES,
  THERAPEUTIC_AREAS,
  type TrialPhase,
  type TrialStatus,
  type TherapeuticArea,
} from "@/lib/bio-utils";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export type UserRole = "researcher" | "investor" | "verifier" | "guest";

export interface ResearcherCredentials {
  fullName: string;
  institution: string;
  orcid?: string;
  verifiedLab: boolean;
  yearsExperience: number;
}

export interface MilestoneSummary {
  index: number;
  description: string;
  fundsBps: number;
  released: boolean;
  releasedAt?: number; // unix seconds
  evidenceHash?: `0x${string}`;
}

export interface TrialSummary {
  tokenId: number;
  title: string;
  therapeuticArea: TherapeuticArea;
  phase: TrialPhase;
  status: TrialStatus;
  researcher: `0x${string}`;
  institution: string;
  fundingGoalEth: number;
  raisedEth: number;
  totalShares: number;
  sharesSold: number;
  pricePerShareEth: number;
  trustScore: number; // 0–100
  verifierSignatures: number;
  milestones: MilestoneSummary[];
  metadataURI: string;
  createdAt: number; // unix seconds
}

export interface PortfolioPosition {
  tokenId: number;
  shares: number;
  costBasisEth: number;
  acquiredAt: number;
}

export interface WalletInfo {
  address: `0x${string}`;
  chainId: number;
  bioBalance: number; // $BIO governance/utility token balance
  ethBalance: number;
}

interface BioState {
  // identity
  role: UserRole;
  wallet: WalletInfo | null;
  credentials: ResearcherCredentials | null;

  // catalog
  trials: TrialSummary[];

  // investor portfolio
  portfolio: PortfolioPosition[];

  // ui prefs
  preferredArea: TherapeuticArea | "All";
  showOnlyVerified: boolean;

  // ── actions ────────────────────────────────────────────────────────────
  setRole: (role: UserRole) => void;
  connectWallet: (wallet: WalletInfo) => void;
  disconnectWallet: () => void;
  updateBalances: (eth: number, bio: number) => void;

  setCredentials: (creds: ResearcherCredentials | null) => void;

  setTrials: (trials: TrialSummary[]) => void;
  upsertTrial: (trial: TrialSummary) => void;
  signTrial: (tokenId: number) => void;
  releaseMilestone: (
    tokenId: number,
    milestoneIndex: number,
    evidenceHash: `0x${string}`,
  ) => void;

  buyShares: (tokenId: number, shares: number) => { ok: boolean; reason?: string };
  sellShares: (tokenId: number, shares: number) => { ok: boolean; reason?: string };

  setPreferredArea: (area: TherapeuticArea | "All") => void;
  toggleVerifiedOnly: () => void;

  reset: () => void;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Seed data — illustrative trials for the demo marketplace                   */
/* ────────────────────────────────────────────────────────────────────────── */

const SEED_TRIALS: TrialSummary[] = [
  {
    tokenId: 1,
    title: "ATX-441: Selective KRAS-G12C Inhibitor for NSCLC",
    therapeuticArea: "Oncology",
    phase: "Phase II",
    status: "Funding",
    researcher: "0x8f3a4c0a7b9c2d1e5a6b7c8d9e0f1a2b3c4d5e6f",
    institution: "Mass General Brigham — Thoracic Oncology",
    fundingGoalEth: 480,
    raisedEth: 312.4,
    totalShares: 48000,
    sharesSold: 31240,
    pricePerShareEth: 0.01,
    trustScore: 70,
    verifierSignatures: 7,
    milestones: [
      { index: 0, description: "IRB approval & site activation (n=12)", fundsBps: 2000, released: true, releasedAt: 1733011200, evidenceHash: "0x9c1d3a5e7b8c2d4f6a1b3c5d7e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f" },
      { index: 1, description: "Enrollment 50% (n=72) reached", fundsBps: 2500, released: true, releasedAt: 1738195200, evidenceHash: "0xa2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3" },
      { index: 2, description: "Interim safety readout, DSMB signoff", fundsBps: 2500, released: false },
      { index: 3, description: "Primary endpoint readout (PFS)", fundsBps: 3000, released: false },
    ],
    metadataURI: "ipfs://bafybeibioch4inATX441phaseIIkrasG12C",
    createdAt: 1730419200,
  },
  {
    tokenId: 2,
    title: "NeuroTrace-7: Tau-PET Diagnostic for Early Alzheimer's",
    therapeuticArea: "Neurology",
    phase: "Phase III",
    status: "Active",
    researcher: "0x2c5b7a9e1f3d4a6b8c0d2e4f6a8b0c2d4e6f8a0b",
    institution: "UCSF Memory & Aging Center",
    fundingGoalEth: 1200,
    raisedEth: 1200,
    totalShares: 60000,
    sharesSold: 60000,
    pricePerShareEth: 0.02,
    trustScore: 90,
    verifierSignatures: 9,
    milestones: [
      { index: 0, description: "Multi-site IRB harmonization", fundsBps: 1500, released: true, releasedAt: 1722470400, evidenceHash: "0xb1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3" },
      { index: 1, description: "Enrollment milestone n=480", fundsBps: 2000, released: true, releasedAt: 1730073600, evidenceHash: "0xc2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4" },
      { index: 2, description: "12-month longitudinal data lock", fundsBps: 3000, released: true, releasedAt: 1738627200, evidenceHash: "0xd3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5" },
      { index: 3, description: "Diagnostic accuracy primary endpoint (AUC ≥ 0.92)", fundsBps: 2000, released: false },
      { index: 4, description: "Independent radiology validation", fundsBps: 1500, released: false },
    ],
    metadataURI: "ipfs://bafybeineurotrace7TAUPETphaseIII",
    createdAt: 1717200000,
  },
  {
    tokenId: 3,
    title: "CardioGuard-AI: Continuous AFib Detection (Wearable)",
    therapeuticArea: "Cardiology",
    phase: "Phase I",
    status: "Funding",
    researcher: "0x4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e",
    institution: "Stanford Cardiovascular Institute",
    fundingGoalEth: 220,
    raisedEth: 88.0,
    totalShares: 22000,
    sharesSold: 8800,
    pricePerShareEth: 0.01,
    trustScore: 40,
    verifierSignatures: 4,
    milestones: [
      { index: 0, description: "Device CE-marking + IRB", fundsBps: 2000, released: true, releasedAt: 1735603200, evidenceHash: "0xe4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6" },
      { index: 1, description: "Pilot cohort n=40, signal verification", fundsBps: 3000, released: false },
      { index: 2, description: "Sensitivity ≥ 96% vs 12-lead Holter", fundsBps: 5000, released: false },
    ],
    metadataURI: "ipfs://bafybeicardioguardAIphaseI",
    createdAt: 1733616000,
  },
  {
    tokenId: 4,
    title: "ImmunoLink-CAR: Allogeneic CAR-T for Refractory B-ALL",
    therapeuticArea: "Immunology",
    phase: "Phase I",
    status: "Funding",
    researcher: "0x6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a",
    institution: "MD Anderson — Cellular Therapy",
    fundingGoalEth: 640,
    raisedEth: 192.0,
    totalShares: 32000,
    sharesSold: 9600,
    pricePerShareEth: 0.02,
    trustScore: 50,
    verifierSignatures: 5,
    milestones: [
      { index: 0, description: "GMP manufacturing tech-transfer", fundsBps: 2500, released: true, releasedAt: 1736812800, evidenceHash: "0xf5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7" },
      { index: 1, description: "First-in-human dosing (n=3)", fundsBps: 2500, released: false },
      { index: 2, description: "DLT review at MTD", fundsBps: 2500, released: false },
      { index: 3, description: "ORR readout at 28 days", fundsBps: 2500, released: false },
    ],
    metadataURI: "ipfs://bafybeimmunolinkCARphaseI",
    createdAt: 1731331200,
  },
  {
    tokenId: 5,
    title: "GeneRevive-α1: AAV Gene Therapy for α-1 Antitrypsin Deficiency",
    therapeuticArea: "Gene Therapy",
    phase: "Preclinical",
    status: "Funding",
    researcher: "0x1a3c5e7f9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a",
    institution: "Broad Institute",
    fundingGoalEth: 360,
    raisedEth: 36.0,
    totalShares: 36000,
    sharesSold: 3600,
    pricePerShareEth: 0.01,
    trustScore: 20,
    verifierSignatures: 2,
    milestones: [
      { index: 0, description: "Vector optimization & potency assay", fundsBps: 2500, released: false },
      { index: 1, description: "GLP toxicology in NHP", fundsBps: 3500, released: false },
      { index: 2, description: "Pre-IND meeting with FDA", fundsBps: 4000, released: false },
    ],
    metadataURI: "ipfs://bafybeigenereviveAATphasepreclinical",
    createdAt: 1737936000,
  },
  {
    tokenId: 6,
    title: "LongLife-7: Senolytic Combo for Vascular Aging",
    therapeuticArea: "Longevity",
    phase: "Phase II",
    status: "Active",
    researcher: "0x9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d",
    institution: "Buck Institute",
    fundingGoalEth: 540,
    raisedEth: 540,
    totalShares: 54000,
    sharesSold: 54000,
    pricePerShareEth: 0.01,
    trustScore: 80,
    verifierSignatures: 8,
    milestones: [
      { index: 0, description: "Phase IIa enrollment (n=120)", fundsBps: 2000, released: true, releasedAt: 1726185600, evidenceHash: "0x06182a3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a" },
      { index: 1, description: "Biomarker panel readout (12 weeks)", fundsBps: 3000, released: true, releasedAt: 1734739200, evidenceHash: "0x172839a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2" },
      { index: 2, description: "PWV change vs placebo (primary)", fundsBps: 3000, released: false },
      { index: 3, description: "Open-label extension safety (52 wk)", fundsBps: 2000, released: false },
    ],
    metadataURI: "ipfs://bafybeilonglife7senolyticphaseII",
    createdAt: 1720656000,
  },
];

/* ────────────────────────────────────────────────────────────────────────── */
/*  Store                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

const initialBaseState = {
  role: "guest" as UserRole,
  wallet: null,
  credentials: null,
  trials: SEED_TRIALS,
  portfolio: [] as PortfolioPosition[],
  preferredArea: "All" as TherapeuticArea | "All",
  showOnlyVerified: false,
};

export const useBioStore = create<BioState>()(
  persist(
    (set, get) => ({
      ...initialBaseState,

      setRole: (role) => set({ role }),

      connectWallet: (wallet) => {
        set({
          wallet,
          role: get().role === "guest" ? "investor" : get().role,
        });
      },

      disconnectWallet: () =>
        set({ wallet: null, role: "guest", credentials: null }),

      updateBalances: (eth, bio) => {
        const w = get().wallet;
        if (!w) return;
        set({ wallet: { ...w, ethBalance: eth, bioBalance: bio } });
      },

      setCredentials: (credentials) => set({ credentials }),

      setTrials: (trials) => set({ trials }),

      upsertTrial: (trial) => {
        const trials = get().trials.slice();
        const idx = trials.findIndex((t) => t.tokenId === trial.tokenId);
        if (idx >= 0) trials[idx] = trial;
        else trials.push(trial);
        set({ trials });
      },

      signTrial: (tokenId) => {
        const trials = get().trials.map((t) => {
          if (t.tokenId !== tokenId) return t;
          const sigs = Math.min(10, t.verifierSignatures + 1);
          return {
            ...t,
            verifierSignatures: sigs,
            trustScore: sigs * 10,
          };
        });
        set({ trials });
      },

      releaseMilestone: (tokenId, milestoneIndex, evidenceHash) => {
        const now = Math.floor(Date.now() / 1000);
        const trials = get().trials.map((t) => {
          if (t.tokenId !== tokenId) return t;
          const milestones = t.milestones.map((m) =>
            m.index === milestoneIndex && !m.released
              ? { ...m, released: true, releasedAt: now, evidenceHash }
              : m,
          );
          const allReleased = milestones.every((m) => m.released);
          return {
            ...t,
            milestones,
            status: (allReleased
              ? "Completed"
              : t.status === "Funding"
                ? "Active"
                : t.status) as TrialStatus,
          };
        });
        set({ trials });
      },

      buyShares: (tokenId, shares) => {
        if (shares <= 0) return { ok: false, reason: "Share amount must be positive." };
        const wallet = get().wallet;
        if (!wallet) return { ok: false, reason: "Connect a wallet first." };

        const trials = get().trials.slice();
        const idx = trials.findIndex((t) => t.tokenId === tokenId);
        if (idx < 0) return { ok: false, reason: "Trial not found." };

        const trial = trials[idx];
        if (trial.status !== "Funding") {
          return { ok: false, reason: `Trial is ${trial.status.toLowerCase()}, not accepting funding.` };
        }
        const remaining = trial.totalShares - trial.sharesSold;
        if (shares > remaining) {
          return { ok: false, reason: `Only ${remaining.toLocaleString()} shares remain.` };
        }
        const cost = shares * trial.pricePerShareEth;
        if (cost > wallet.ethBalance) {
          return { ok: false, reason: "Insufficient ETH balance." };
        }

        const updatedTrial: TrialSummary = {
          ...trial,
          sharesSold: trial.sharesSold + shares,
          raisedEth: trial.raisedEth + cost,
          status:
            trial.sharesSold + shares >= trial.totalShares
              ? "Active"
              : trial.status,
        };
        trials[idx] = updatedTrial;

        const portfolio = get().portfolio.slice();
        const pIdx = portfolio.findIndex((p) => p.tokenId === tokenId);
        if (pIdx >= 0) {
          portfolio[pIdx] = {
            ...portfolio[pIdx],
            shares: portfolio[pIdx].shares + shares,
            costBasisEth: portfolio[pIdx].costBasisEth + cost,
          };
        } else {
          portfolio.push({
            tokenId,
            shares,
            costBasisEth: cost,
            acquiredAt: Math.floor(Date.now() / 1000),
          });
        }

        set({
          trials,
          portfolio,
          wallet: { ...wallet, ethBalance: wallet.ethBalance - cost },
        });
        return { ok: true };
      },

      sellShares: (tokenId, shares) => {
        if (shares <= 0) return { ok: false, reason: "Share amount must be positive." };
        const portfolio = get().portfolio.slice();
        const pIdx = portfolio.findIndex((p) => p.tokenId === tokenId);
        if (pIdx < 0 || portfolio[pIdx].shares < shares) {
          return { ok: false, reason: "You do not hold enough shares." };
        }
        const trial = get().trials.find((t) => t.tokenId === tokenId);
        if (!trial) return { ok: false, reason: "Trial not found." };

        const proceeds = shares * trial.pricePerShareEth;
        const remaining = portfolio[pIdx].shares - shares;
        if (remaining === 0) portfolio.splice(pIdx, 1);
        else
          portfolio[pIdx] = {
            ...portfolio[pIdx],
            shares: remaining,
            costBasisEth:
              portfolio[pIdx].costBasisEth *
              (remaining / (remaining + shares)),
          };

        const wallet = get().wallet;
        set({
          portfolio,
          wallet: wallet
            ? { ...wallet, ethBalance: wallet.ethBalance + proceeds }
            : wallet,
        });
        return { ok: true };
      },

      setPreferredArea: (area) => set({ preferredArea: area }),
      toggleVerifiedOnly: () =>
        set({ showOnlyVerified: !get().showOnlyVerified }),

      reset: () => set({ ...initialBaseState }),
    }),
    {
      name: "biochain-store-v1",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? ({
              getItem: () => null,
              setItem: () => undefined,
              removeItem: () => undefined,
            } as Storage)
          : window.localStorage,
      ),
      partialize: (s) => ({
        role: s.role,
        wallet: s.wallet,
        credentials: s.credentials,
        portfolio: s.portfolio,
        preferredArea: s.preferredArea,
        showOnlyVerified: s.showOnlyVerified,
        // trials are seeded in code; do not persist (avoids stale demo data)
      }),
      version: 1,
    },
  ),
);

/* ────────────────────────────────────────────────────────────────────────── */
/*  Selectors (kept colocated for ergonomic imports)                           */
/* ────────────────────────────────────────────────────────────────────────── */

export const selectFilteredTrials = (s: BioState): TrialSummary[] => {
  let list = s.trials;
  if (s.preferredArea !== "All") {
    list = list.filter((t) => t.therapeuticArea === s.preferredArea);
  }
  if (s.showOnlyVerified) {
    list = list.filter((t) => t.trustScore >= 50);
  }
  return list;
};

export const selectPortfolioValue = (s: BioState): number => {
  let v = 0;
  for (const p of s.portfolio) {
    const t = s.trials.find((tr) => tr.tokenId === p.tokenId);
    if (!t) continue;
    v += p.shares * t.pricePerShareEth;
  }
  return v;
};

export const selectIsResearcher = (s: BioState): boolean =>
  s.role === "researcher";

export const selectIsConnected = (s: BioState): boolean => s.wallet !== null;

// Re-exports so the store is the single import surface for the UI.
export {
  TRIAL_PHASES,
  TRIAL_STATUSES,
  THERAPEUTIC_AREAS,
};
export type { TrialPhase, TrialStatus, TherapeuticArea };

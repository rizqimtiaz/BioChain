/**
 * BioChain – Shared utilities
 * ----------------------------------------------------------------------------
 * Cryptographic hashing, medical-data validation (Zod), and small numerical
 * helpers used across the UI, API routes, and on-chain anchoring layer.
 *
 * Design notes:
 *   • All hashing functions return lowercase hex prefixed with "0x" so they
 *     map directly to Solidity `bytes32`.
 *   • Validation schemas are intentionally strict — malformed clinical data
 *     must be rejected before it ever reaches the audit trail.
 *   • This module is isomorphic (Node + browser); we use the WebCrypto API
 *     which exists in modern Node (>=19) and all evergreen browsers.
 */

import { z } from "zod";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Tailwind class merge helper                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Crypto: SHA-256 hashing (isomorphic)                                       */
/* ────────────────────────────────────────────────────────────────────────── */

const HEX_TABLE = "0123456789abcdef";

function bytesToHex(bytes: Uint8Array): string {
  let out = "0x";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += HEX_TABLE[b >> 4] + HEX_TABLE[b & 0x0f];
  }
  return out;
}

function getCrypto(): Crypto {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    return globalThis.crypto;
  }
  throw new Error(
    "WebCrypto SubtleCrypto is unavailable in this runtime. " +
      "BioChain requires Node >= 19 or a modern browser.",
  );
}

/**
 * SHA-256 of an arbitrary string. Returns lowercase 0x-prefixed hex (66 chars).
 * Suitable for direct passing to a Solidity `bytes32` argument.
 */
export async function sha256Hex(input: string): Promise<`0x${string}`> {
  const enc = new TextEncoder().encode(input);
  const digest = await getCrypto().subtle.digest("SHA-256", enc);
  return bytesToHex(new Uint8Array(digest)) as `0x${string}`;
}

/**
 * SHA-256 of raw bytes (Uint8Array, ArrayBuffer, or Buffer-like). Lowercase hex.
 */
export async function sha256Bytes(
  input: ArrayBuffer | Uint8Array,
): Promise<`0x${string}`> {
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
  const digest = await getCrypto().subtle.digest("SHA-256", buf);
  return bytesToHex(new Uint8Array(digest)) as `0x${string}`;
}

/**
 * Hash any JSON-serializable payload deterministically.
 * Keys are sorted recursively so payload order can never change the digest —
 * critical for reproducible audit trails.
 */
export async function sha256Canonical(payload: unknown): Promise<`0x${string}`> {
  return sha256Hex(canonicalize(payload));
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map(
    (k) =>
      JSON.stringify(k) +
      ":" +
      canonicalize((value as Record<string, unknown>)[k]),
  );
  return "{" + parts.join(",") + "}";
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Domain enums (mirrored from the IPNFTRegistry contract)                    */
/* ────────────────────────────────────────────────────────────────────────── */

export const TRIAL_PHASES = [
  "Preclinical",
  "Phase I",
  "Phase II",
  "Phase III",
  "Phase IV",
] as const;
export type TrialPhase = (typeof TRIAL_PHASES)[number];

export const TRIAL_STATUSES = [
  "Funding",
  "Active",
  "Completed",
  "Cancelled",
] as const;
export type TrialStatus = (typeof TRIAL_STATUSES)[number];

export const THERAPEUTIC_AREAS = [
  "Oncology",
  "Cardiology",
  "Neurology",
  "Immunology",
  "Endocrinology",
  "Rare Disease",
  "Infectious Disease",
  "Gene Therapy",
  "Mental Health",
  "Longevity",
] as const;
export type TherapeuticArea = (typeof THERAPEUTIC_AREAS)[number];

/* ────────────────────────────────────────────────────────────────────────── */
/*  Zod schemas: trial metadata + clinical data anchoring                      */
/* ────────────────────────────────────────────────────────────────────────── */

const HEX32 = /^0x[0-9a-fA-F]{64}$/;
const ETH_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export const ethAddressSchema = z
  .string()
  .regex(ETH_ADDRESS, "Must be a valid 0x-prefixed Ethereum address");

export const bytes32Schema = z
  .string()
  .regex(HEX32, "Must be a 32-byte (64 hex char) 0x-prefixed hash");

export const milestoneSchema = z.object({
  description: z
    .string()
    .min(8, "Milestone description must be at least 8 characters")
    .max(160, "Milestone description must be at most 160 characters"),
  fundsBps: z
    .number()
    .int("Basis points must be an integer")
    .min(1, "Each milestone must release at least 0.01% of funds")
    .max(10_000, "Single milestone cannot exceed 100% of funds"),
});

export const trialMetadataSchema = z
  .object({
    title: z.string().min(8).max(160),
    therapeuticArea: z.enum(THERAPEUTIC_AREAS),
    phase: z.enum(TRIAL_PHASES),
    summary: z.string().min(40).max(2000),
    principalInvestigator: z.string().min(2).max(120),
    institution: z.string().min(2).max(160),
    irbApprovalId: z.string().min(3).max(64).optional(),
    fundingGoalEth: z.number().positive().max(1_000_000),
    totalShares: z.number().int().positive().max(10_000_000),
    metadataURI: z
      .string()
      .url()
      .or(z.string().regex(/^ipfs:\/\/[a-zA-Z0-9]+/)),
    milestones: z.array(milestoneSchema).min(1).max(12),
  })
  .superRefine((value, ctx) => {
    const sum = value.milestones.reduce((acc, m) => acc + m.fundsBps, 0);
    if (sum !== 10_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["milestones"],
        message: `Milestone fund allocations must sum to exactly 10000 bps (got ${sum}).`,
      });
    }
  });

export type TrialMetadata = z.infer<typeof trialMetadataSchema>;

/**
 * Schema for the *content* of a wearable / clinical data submission. The hash
 * we anchor on-chain is computed over the canonical form of this payload.
 */
export const clinicalDataPointSchema = z.object({
  participantPseudoId: z
    .string()
    .min(8, "Participant pseudo-id must be ≥8 chars")
    .max(64),
  recordedAt: z
    .string()
    .datetime({ offset: true, message: "recordedAt must be ISO-8601" }),
  source: z.enum([
    "wearable",
    "lab-instrument",
    "self-report",
    "ehr",
    "imaging",
  ]),
  measurements: z
    .array(
      z.object({
        code: z.string().min(1).max(64), // e.g. LOINC code
        value: z.number().finite(),
        unit: z.string().min(1).max(16),
      }),
    )
    .min(1)
    .max(64),
  deviceId: z.string().min(1).max(64).optional(),
  notes: z.string().max(500).optional(),
});

export type ClinicalDataPoint = z.infer<typeof clinicalDataPointSchema>;

export const anchorRequestSchema = z.object({
  tokenId: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => /^\d+$/.test(v), "tokenId must be a positive integer string"),
  submittedBy: ethAddressSchema,
  payload: clinicalDataPointSchema,
});

export type AnchorRequest = z.infer<typeof anchorRequestSchema>;

/* ────────────────────────────────────────────────────────────────────────── */
/*  Numeric / formatting helpers                                               */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Format ETH-denominated values with up to 4 fractional digits and locale
 * grouping (e.g. 1,234.5 ETH).
 */
export function formatEth(value: number, fractionDigits = 4): string {
  if (!Number.isFinite(value)) return "0 ETH";
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })} ETH`;
}

export function formatPercent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return "0%";
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return `${pct.toFixed(digits)}%`;
}

/**
 * Compress an Ethereum address for display (0x1234…abcd).
 */
export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return "—";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/**
 * Compute trust score using the same saturating function as the contract:
 * score = min(signatures, 10) * 10  → in [0, 100].
 */
export function computeTrustScore(signatures: number): number {
  if (!Number.isFinite(signatures) || signatures < 0) return 0;
  return Math.min(10, Math.floor(signatures)) * 10;
}

export type TrustTier = "Unverified" | "Emerging" | "Validated" | "Gold-Standard";

export function trustTier(score: number): TrustTier {
  if (score >= 80) return "Gold-Standard";
  if (score >= 50) return "Validated";
  if (score >= 20) return "Emerging";
  return "Unverified";
}

/**
 * Map a Solidity `Phase` enum value (0–4) to a display label.
 */
export function phaseLabel(phase: number): TrialPhase {
  return TRIAL_PHASES[phase] ?? "Preclinical";
}

export function statusLabel(status: number): TrialStatus {
  return TRIAL_STATUSES[status] ?? "Funding";
}

/**
 * Validate a pre-computed bytes32 hash before submitting on-chain.
 */
export function isBytes32(value: string): value is `0x${string}` {
  return HEX32.test(value);
}

/**
 * Safe parser that returns either { ok: true, data } or { ok: false, errors }.
 * Useful for API routes that must respond with structured 400s.
 */
export function safeParse<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): { ok: true; data: z.infer<T> } | { ok: false; errors: z.ZodIssue[] } {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: result.error.issues };
}

/**
 * Build the canonical anchor record that is hashed and pinned on-chain.
 * Including `submittedBy` and `tokenId` in the digest binds the data to
 * both the trial and the submitter, making forged submissions detectable.
 */
export async function buildAnchor(
  req: AnchorRequest,
): Promise<{
  hash: `0x${string}`;
  canonical: string;
  recordedAt: string;
}> {
  const canonical = canonicalize({
    tokenId: req.tokenId,
    submittedBy: req.submittedBy.toLowerCase(),
    payload: req.payload,
  });
  const hash = await sha256Hex(canonical);
  return { hash, canonical, recordedAt: new Date().toISOString() };
}

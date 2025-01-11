/**
 * BioChain – /api/anchor-data
 * ----------------------------------------------------------------------------
 * POST a clinical-data payload (e.g. from a wearable upload pipeline). The
 * route:
 *
 *   1. Strictly validates the request shape with Zod.
 *   2. Computes a deterministic SHA-256 over the canonicalized payload.
 *   3. Returns the bytes32 hash and a structured "anchor receipt" that the
 *      caller can submit to `IPNFTRegistry.anchorClinicalData(tokenId, hash)`.
 *
 * IMPORTANT: the raw clinical data is NEVER persisted by this route. Only the
 * hash leaves the request scope. This preserves patient privacy while still
 * producing a tamper-evident audit trail anchored on-chain.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  anchorRequestSchema,
  buildAnchor,
  safeParse,
  sha256Hex,
} from "@/lib/bio-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnchorReceipt {
  tokenId: string;
  submittedBy: `0x${string}`;
  dataHash: `0x${string}`;
  receiptHash: `0x${string}`;
  recordedAt: string;
  algorithm: "SHA-256";
  encoding: "hex";
  byteLength: 32;
  measurements: number;
  source: string;
  participantPseudoId: string;
  notice: string;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  POST – submit a clinical data payload for hashing & anchoring              */
/* ────────────────────────────────────────────────────────────────────────── */

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_JSON",
        message: "Request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = safeParse(anchorRequestSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Anchor request failed schema validation.",
        issues: parsed.errors.map((i) => ({
          path: i.path.join("."),
          code: i.code,
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const req = parsed.data;

  let dataHash: `0x${string}`;
  let recordedAt: string;
  try {
    const result = await buildAnchor(req);
    dataHash = result.hash;
    recordedAt = result.recordedAt;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Hashing failed in runtime.";
    return NextResponse.json(
      { ok: false, error: "HASHING_FAILED", message },
      { status: 500 },
    );
  }

  // The receipt itself is also hashed so callers can verify the route did
  // not silently mutate any field. The receiptHash is a function of the
  // (dataHash, tokenId, submittedBy, recordedAt) tuple.
  const receiptHash = await sha256Hex(
    `${dataHash}|${req.tokenId}|${req.submittedBy.toLowerCase()}|${recordedAt}`,
  );

  const receipt: AnchorReceipt = {
    tokenId: req.tokenId,
    submittedBy: req.submittedBy.toLowerCase() as `0x${string}`,
    dataHash,
    receiptHash,
    recordedAt,
    algorithm: "SHA-256",
    encoding: "hex",
    byteLength: 32,
    measurements: req.payload.measurements.length,
    source: req.payload.source,
    participantPseudoId: req.payload.participantPseudoId,
    notice:
      "Raw clinical data is discarded after hashing. Submit the returned dataHash to IPNFTRegistry.anchorClinicalData(tokenId, dataHash).",
  };

  return NextResponse.json(
    { ok: true, receipt },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-BioChain-Hash-Algorithm": "SHA-256",
      },
    },
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  GET – health probe / capability descriptor                                 */
/* ────────────────────────────────────────────────────────────────────────── */

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: true,
      service: "biochain-anchor",
      version: "1.0.0",
      acceptedSources: ["wearable", "lab-instrument", "self-report", "ehr", "imaging"],
      hash: { algorithm: "SHA-256", encoding: "hex", byteLength: 32 },
      contract: {
        name: "IPNFTRegistry",
        method: "anchorClinicalData(uint256 tokenId, bytes32 dataHash)",
      },
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  OPTIONS – CORS preflight (kept restrictive; relax via env if needed)       */
/* ────────────────────────────────────────────────────────────────────────── */

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Compile-time guard: make sure z is reachable (avoids tree-shake removal in
// some bundlers when only types are referenced).
export const __schemaCheck = z.literal("biochain-anchor");

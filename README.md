# BioChain — Decentralized Clinical Trial Network

> **DeSci · IP-NFTs · Verifiable Trial Data · Trustless Peer Review**

BioChain is a production-ready Next.js 14 dApp for funding and managing
clinical research as on-chain Intellectual Property NFTs.

- **Researchers** mint trial protocols as ERC-1155 IP-NFTs with milestone
  schedules.
- **Investors** buy fractional shares (in $BIO) and earn proportional rights
  to the underlying IP.
- **Verifier laboratories** sign IP-NFTs after running validation tests,
  building a decentralized peer-review trust score.
- **Wearable + lab data** is hashed (SHA-256) and anchored to the trial,
  producing an immutable audit trail for regulators.

---

| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| State | Zustand (persisted, hydration-safe) |
| Wallet | wagmi 2 + viem 2 |
| Data | TanStack Query 5 |
| Validation | Zod 3 |
| Charts | Recharts 2 |
| Animation | Framer Motion 11 |
| Icons | Lucide React |
| Smart Contracts | Solidity 0.8.24 (ERC-1155 IP-NFT registry) |

---

## Getting started

```bash
# Install
npm install

# Dev server
npm run dev
# → http://localhost:3000

# Production build
npm run build
npm run start
```

### Environment variables

Optional — falls back to viem public RPC if not set.

```bash
NEXT_PUBLIC_MAINNET_RPC=https://...
<!-- metadata: ex0wbr8wnh -->
NEXT_PUBLIC_SEPOLIA_RPC=https://...
```

---

## Repository layout

```
contracts/IPNFTRegistry.sol   ERC-1155 registry: mint, fractionalize,
                              milestone escrow, data anchoring, peer review.

app/
  layout.tsx                  Root dashboard chrome (TopBar, SideRail, Footer).
  page.tsx                    Overview KPIs, featured trials, activity rail.
  providers.tsx               Wagmi + TanStack Query providers.
  globals.css                 Sterile design tokens + base styles.
  explore/page.tsx            Marketplace (filters + Recharts dashboards).
  api/anchor-data/route.ts    POST: validate + SHA-256 hash clinical data.

components/
  TrialCard.tsx               Trial summary card with invest / sign actions.
  TopBar.tsx                  Header (brand, role switcher, wallet).
  SideRail.tsx                Persistent sidebar navigation.
  StatusFooter.tsx            Live block / gas / RPC status.

store/useBioStore.ts          Global Zustand store + selectors.
lib/bio-utils.ts              Hashing, Zod schemas, formatters.

tailwind.config.ts            Sterile palette (white, slate, Trust Blue).
```

---

## Smart-contract surface

`IPNFTRegistry` (Solidity ^0.8.24) is intentionally self-contained — it
implements minimal ERC-1155, Ownable, and ReentrancyGuard primitives inline so
the entire surface can be reviewed in a single file.

Key methods:

| Method | Caller | Purpose |
| ------ | ------ | ------- |
| `mintTrial(...)` | Researcher | Mint an IP-NFT and define a milestone schedule that must sum to 10 000 bps. |
| `buyShares(tokenId, n)` | Investor | Buy fractional shares; payment escrowed per-trial. |
| `releaseMilestone(id, idx, hash)` | Researcher | Anchor evidence and unlock the milestone's tranche of escrow. |
| `anchorClinicalData(id, hash)` | Researcher | Append a SHA-256 hash to the trial's audit trail. |
| `peerReview(id, hash)` | Verifier Lab (whitelisted) | Sign the IP-NFT; raises trust score. |
| `cancelTrial(id)` | Researcher / Owner | Open the trial for pro-rata refunds. |
| `claimRefund(id)` | Investor | Withdraw remaining escrow share after cancellation. |
| `setVerifierLab(addr, ok)` | Owner | Curate the peer-review whitelist. |

Trust score is the saturating function `min(signatures, 10) × 10` ∈ `[0, 100]`,
mirrored in `lib/bio-utils.ts::computeTrustScore`.

---

## API: `POST /api/anchor-data`

Takes a clinical-data payload, validates it with Zod, computes a deterministic
SHA-256 over the canonicalized form, and returns an anchor receipt suitable
for `IPNFTRegistry.anchorClinicalData(tokenId, dataHash)`.

```jsonc
// Request
{
  "tokenId": "1",
  "submittedBy": "0xA11CE0DE1234567890abcDEF0123456789AbCdEf",
  "payload": {
    "participantPseudoId": "p-9b4c2e3a1d",
    "recordedAt": "2026-05-03T15:00:00.000Z",
    "source": "wearable",
    "measurements": [
      { "code": "8867-4", "value": 72,   "unit": "bpm"    },
      { "code": "8480-6", "value": 119,  "unit": "mmHg"   }
    ],
    "deviceId": "biostrap-7"
  }
}
```

```jsonc
// 200 OK
{
  "ok": true,
  "receipt": {
    "tokenId": "1",
    "submittedBy": "0xa11c...cdef",
    "dataHash":   "0x9c1d3a5e...",
    "receiptHash":"0x...",
    "recordedAt": "2026-05-03T...Z",
    "algorithm":  "SHA-256",
    "encoding":   "hex",
    "byteLength": 32,
    "measurements": 2,
    "source": "wearable"
  }
}
```

Raw clinical data is **never persisted** by the route — only the hash exits
the request scope.

---

## Design philosophy

The interface is deliberately **sterile and laboratory-grade**: pure white
surfaces, slate-gray data labels, and a single canonical accent (`#1e40af`,
"Trust Blue") reserved for verified state and primary actions. No glassmorphism,
no rainbow gradients — the only ornament is the data itself.

---

## License

MIT © BioChain Foundation

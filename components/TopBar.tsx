"use client";

/**
 * BioChain – TopBar
 * Global header for the dashboard. Houses the brand mark, network indicator,
 * role switcher (Researcher / Investor / Verifier), wallet connector, and
 * a $BIO balance pill.
 */

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dna,
  Wallet,
  Wifi,
  ChevronDown,
  CircleUser,
  Beaker,
  TrendingUp,
  Microscope,
  LogOut,
} from "lucide-react";
import {
  useBioStore,
  type UserRole,
} from "@/store/useBioStore";
import { cn, shortAddress } from "@/lib/bio-utils";

const ROLE_OPTIONS: {
  id: UserRole;
  label: string;
  icon: typeof Beaker;
}[] = [
  { id: "researcher", label: "Researcher", icon: Beaker },
  { id: "investor", label: "Investor", icon: TrendingUp },
  { id: "verifier", label: "Verifier Lab", icon: Microscope },
];

export function TopBar() {
  const role = useBioStore((s) => s.role);
  const wallet = useBioStore((s) => s.wallet);
  const setRole = useBioStore((s) => s.setRole);
  const connectWallet = useBioStore((s) => s.connectWallet);
  const disconnectWallet = useBioStore((s) => s.disconnectWallet);

  // Auto-seed a deterministic dev wallet on first mount so the demo is
  // immediately interactive. Real deployment would replace with wagmi
  // useConnect().
  useEffect(() => {
    if (!wallet) {
      connectWallet({
        address: "0xA11CE0DE1234567890abcDEF0123456789AbCdEf",
        chainId: 11155111, // Sepolia
        bioBalance: 12500,
        ethBalance: 4.21,
      });
    }
  }, [wallet, connectWallet]);

  const networkLabel =
    wallet?.chainId === 1
      ? "Mainnet"
      : wallet?.chainId === 11155111
        ? "Sepolia"
        : wallet?.chainId
          ? `Chain ${wallet.chainId}`
          : "Disconnected";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-4 px-4 lg:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="group flex items-center gap-2 focus-ring rounded-clinical"
          aria-label="BioChain home"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-clinical bg-trust-800 text-white shadow-clinical">
            <Dna className="h-4 w-4" strokeWidth={2.25} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-clinical-success ring-2 ring-canvas" />
          </span>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              BioChain
            </span>
            <span className="text-2xs font-medium uppercase tracking-clinical text-slate-500">
              Decentralized Clinical Trials
            </span>
          </div>
        </Link>

        {/* Primary nav */}
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Primary">
          <NavLink href="/" label="Overview" />
          <NavLink href="/explore" label="Explore Trials" />
          <NavLink href="/portfolio" label="Portfolio" />
          <NavLink href="/lab" label="Researcher Lab" />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Network pill */}
          <div className="hidden items-center gap-1.5 rounded-sharp border border-slate-200 bg-canvas-subtle px-2 py-1 text-2xs font-medium text-slate-700 sm:inline-flex">
            <Wifi className="h-3 w-3 text-clinical-success" />
            <span className="font-mono">{networkLabel}</span>
          </div>

          {/* Role switcher */}
          <RoleSwitcher current={role} onChange={setRole} />

          {/* $BIO balance */}
          {wallet && (
            <div className="hidden items-center gap-1.5 rounded-sharp border border-trust-200 bg-trust-50 px-2 py-1 text-2xs font-semibold text-trust-800 md:inline-flex">
              <span className="font-mono">
                {wallet.bioBalance.toLocaleString()}
              </span>
              <span>$BIO</span>
            </div>
          )}

          {/* Wallet */}
          {wallet ? (
            <div className="group relative">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-clinical border border-slate-300 bg-canvas px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-ring"
              >
                <CircleUser className="h-4 w-4 text-trust-800" />
                <span className="font-mono">{shortAddress(wallet.address)}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>
              <div className="invisible absolute right-0 top-full mt-1 w-56 rounded-clinical border border-slate-200 bg-canvas p-2 opacity-0 shadow-clinical-md transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="px-2 py-1.5 text-2xs font-semibold uppercase tracking-clinical text-slate-500">
                  Wallet
                </div>
                <div className="px-2 pb-2 font-mono text-xs text-slate-700 break-all">
                  {wallet.address}
                </div>
                <div className="grid grid-cols-2 gap-2 px-2 pb-2 text-2xs">
                  <div className="rounded-sharp bg-canvas-subtle p-2">
                    <div className="text-slate-500">ETH</div>
                    <div className="font-mono text-sm text-slate-900">
                      {wallet.ethBalance.toFixed(3)}
                    </div>
                  </div>
                  <div className="rounded-sharp bg-trust-50 p-2">
                    <div className="text-trust-800">$BIO</div>
                    <div className="font-mono text-sm text-trust-800">
                      {wallet.bioBalance.toLocaleString()}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => disconnectWallet()}
                  className="flex w-full items-center gap-2 rounded-sharp px-2 py-1.5 text-xs font-medium text-clinical-danger hover:bg-clinical-danger-soft"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                connectWallet({
                  address: "0xA11CE0DE1234567890abcDEF0123456789AbCdEf",
                  chainId: 11155111,
                  bioBalance: 12500,
                  ethBalance: 4.21,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-clinical bg-trust-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-trust-900 focus-ring"
            >
              <Wallet className="h-3.5 w-3.5" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Animated trust indicator strip */}
      <motion.div
        layoutId="biochain-trust-strip"
        className="h-[2px] w-full bg-trust-gradient"
        initial={{ scaleX: 0, transformOrigin: "0% 50%" }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
      />
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-clinical px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-ring"
    >
      {label}
    </Link>
  );
}

function RoleSwitcher({
  current,
  onChange,
}: {
  current: UserRole;
  onChange: (r: UserRole) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Active role"
      className="hidden items-center rounded-clinical border border-slate-200 bg-canvas p-0.5 text-2xs font-semibold lg:inline-flex"
    >
      {ROLE_OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = current === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-sharp px-2 py-1 transition-colors",
              active
                ? "bg-trust-800 text-white shadow-clinical"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default TopBar;

"use client";

/**
 * BioChain – SideRail
 * Persistent vertical navigation surface for the dashboard. Shows the
 * connected user's role context, a quick stat panel ($BIO + active trials),
 * and per-section navigation.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Briefcase,
  Beaker,
  ShieldCheck,
  FileSignature,
  Activity,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/bio-utils";
import {
  useBioStore,
  selectPortfolioValue,
} from "@/store/useBioStore";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

const PRIMARY: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/explore", label: "Explore Trials", icon: Search },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
];

const RESEARCH: NavItem[] = [
  { href: "/lab", label: "Researcher Lab", icon: Beaker },
  { href: "/lab/mint", label: "Mint Trial IP-NFT", icon: FileSignature },
];

const VERIFY: NavItem[] = [
  { href: "/verify", label: "Peer Review Queue", icon: ShieldCheck },
  { href: "/verify/anchors", label: "Data Anchors", icon: Activity },
];

export function SideRail() {
  const pathname = usePathname() ?? "/";
  const role = useBioStore((s) => s.role);
  const trials = useBioStore((s) => s.trials);
  const wallet = useBioStore((s) => s.wallet);
  const portfolioValue = useBioStore(selectPortfolioValue);

  const activeTrials = trials.filter((t) => t.status === "Active").length;
  const fundingTrials = trials.filter((t) => t.status === "Funding").length;

  return (
    <aside
      className="hidden w-60 shrink-0 border-r border-slate-200 bg-canvas lg:flex lg:flex-col"
      aria-label="Sidebar navigation"
    >
      {/* Role context card */}
      <div className="border-b border-slate-200 p-4">
        <div className="rounded-clinical border border-slate-200 bg-canvas-subtle p-3">
          <div className="text-2xs font-semibold uppercase tracking-clinical text-slate-500">
            Active Role
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-semibold capitalize text-slate-900">
              {role === "guest" ? "Guest" : role}
            </span>
            <span className="rounded-sharp bg-trust-800 px-1.5 py-0.5 text-2xs font-bold uppercase tracking-clinical text-white">
              v1.0
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Active" value={activeTrials.toString()} />
            <Stat label="Funding" value={fundingTrials.toString()} />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <Stat
              label="Portfolio"
              value={`${portfolioValue.toFixed(2)} ETH`}
              accent
            />
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-3"
        aria-label="Sections"
      >
        <NavGroup label="Marketplace" items={PRIMARY} pathname={pathname} />

        {(role === "researcher" || role === "guest") && (
          <NavGroup label="Research" items={RESEARCH} pathname={pathname} />
        )}

        {(role === "verifier" || role === "guest") && (
          <NavGroup
            label="Verification"
            items={VERIFY}
            pathname={pathname}
          />
        )}
      </nav>

      {/* Footer help card */}
      <div className="border-t border-slate-200 p-3">
        <Link
          href="/docs"
          className="flex items-center gap-2 rounded-clinical bg-canvas-subtle px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-ring"
        >
          <HelpCircle className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Protocol Docs</span>
            <span className="text-2xs text-slate-400">
              {wallet ? "Verifier API · v1" : "Read the whitepaper"}
            </span>
          </div>
        </Link>
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div>
      <div className="mb-1 px-2 text-2xs font-semibold uppercase tracking-clinical text-slate-400">
        {label}
      </div>
      <ul className="flex flex-col gap-0.5">
        {items.map(({ href, label: l, icon: Icon, badge }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2 rounded-clinical px-2 py-1.5 text-xs font-medium transition-colors focus-ring",
                  active
                    ? "bg-trust-50 text-trust-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active
                      ? "text-trust-800"
                      : "text-slate-400 group-hover:text-slate-600",
                  )}
                />
                <span className="flex-1">{l}</span>
                {badge && (
                  <span className="rounded-sharp bg-trust-800 px-1.5 py-0.5 text-2xs font-bold text-white">
                    {badge}
                  </span>
                )}
                {active && (
                  <span
                    aria-hidden
                    className="ml-auto h-4 w-0.5 rounded-sharp bg-trust-800"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-sharp px-2 py-1.5",
        accent ? "bg-trust-800 text-white" : "bg-canvas",
      )}
    >
      <div
        className={cn(
          "text-2xs font-medium uppercase tracking-clinical",
          accent ? "text-trust-100" : "text-slate-500",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "font-mono text-sm tabular-nums",
          accent ? "text-white" : "text-slate-900",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export default SideRail;

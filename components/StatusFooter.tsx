"use client";

/**
 * BioChain – StatusFooter
 * A persistent bottom bar that mimics laboratory equipment readouts:
 * latest block, gas, network heartbeat, and protocol version.
 */

import { useEffect, useState } from "react";
import { Activity, GitBranch, Server, Clock } from "lucide-react";

export function StatusFooter() {
  const [block, setBlock] = useState<number>(20_894_211);
  const [gasGwei, setGasGwei] = useState<number>(7.2);
  const [latencyMs, setLatencyMs] = useState<number>(83);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    setNow(new Date().toUTCString());
    const id = setInterval(() => {
      setBlock((b) => b + 1);
      setGasGwei((g) =>
        Math.max(2, +(g + (Math.random() - 0.5) * 0.6).toFixed(2)),
      );
      setLatencyMs((l) =>
        Math.max(20, Math.round(l + (Math.random() - 0.5) * 18)),
      );
      setNow(new Date().toUTCString());
    }, 12_000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer
      className="border-t border-slate-200 bg-canvas"
      aria-label="Network status"
    >
      <div className="mx-auto flex h-9 w-full max-w-screen-2xl items-center gap-4 px-4 text-2xs text-slate-500 lg:px-6">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clinical-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-clinical-success" />
          </span>
          <span className="font-medium text-slate-600">RPC Online</span>
        </div>

        <Divider />

        <Item
          icon={GitBranch}
          label="Block"
          value={`#${block.toLocaleString()}`}
        />
        <Item icon={Server} label="Gas" value={`${gasGwei.toFixed(2)} gwei`} />
        <Item
          icon={Activity}
          label="RPC"
          value={`${latencyMs} ms`}
        />

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{now || "—"}</span>
          </span>
          <span className="rounded-sharp bg-canvas-subtle px-1.5 py-0.5 font-mono text-2xs text-slate-500">
            BioChain · v1.0.0
          </span>
        </div>
      </div>
    </footer>
  );
}

function Item({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <span className="hidden items-center gap-1 sm:inline-flex">
      <Icon className="h-3 w-3 text-slate-400" />
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-slate-700">{value}</span>
    </span>
  );
}

function Divider() {
  return (
    <span aria-hidden className="hidden h-3 w-px bg-slate-200 sm:inline-block" />
  );
}

export default StatusFooter;

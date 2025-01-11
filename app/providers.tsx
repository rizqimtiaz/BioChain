"use client";

/**
 * BioChain – Client providers
 * ----------------------------------------------------------------------------
 * Wires Wagmi (viem-backed RPC), TanStack Query, and the rest of the
 * client-side context that the app expects to be present on every route.
 *
 * Configured for Mainnet + Sepolia by default. RPC endpoints fall back to
 * the public viem defaults if no `NEXT_PUBLIC_*_RPC` env var is set.
 */

import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default Providers;

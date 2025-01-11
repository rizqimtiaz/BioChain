import type { Config } from "tailwindcss";

/**
 * BioChain – "Sterile & Professional" design tokens.
 *
 * Palette discipline:
 *   • Pure white surfaces (#FFFFFF) for laboratory cleanliness.
 *   • Slate grays (#64748b family) for data-dense secondary information.
 *   • "Trust Blue" (#1e40af) reserved for verified state, primary CTAs,
 *     and on-chain anchored signals.
 *
 * Anything outside this palette must be intentional (charts, status pills).
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Surfaces ────────────────────────────────────────
        canvas: "#FFFFFF",
        "canvas-subtle": "#F8FAFC",
        "canvas-muted": "#F1F5F9",
        "canvas-inset": "#FAFBFC",

        // ── Slate scale (text + borders) ───────────────────
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },

        // ── Trust Blue (primary, on-chain verified) ────────
        trust: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af", // ← canonical "Trust Blue"
          900: "#1e3a8a",
          950: "#172554",
        },

        // ── Semantic medical signals (clinical, restrained) ─
        clinical: {
          success: "#15803d",
          "success-soft": "#dcfce7",
          warning: "#b45309",
          "warning-soft": "#fef3c7",
          danger: "#b91c1c",
          "danger-soft": "#fee2e2",
          info: "#1e40af",
          "info-soft": "#dbeafe",
          neutral: "#64748b",
          "neutral-soft": "#f1f5f9",
        },
      },

      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
        display: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },

      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
      },

      letterSpacing: {
        clinical: "0.08em",
      },

      borderRadius: {
        sharp: "2px",
        clinical: "6px",
      },

      boxShadow: {
        // Crisp, low-spread shadows — laboratory equipment, not glassmorphism.
        clinical:
          "0 1px 0 0 rgba(15, 23, 42, 0.04), 0 1px 2px 0 rgba(15, 23, 42, 0.06)",
        "clinical-md":
          "0 1px 0 0 rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.08)",
        "clinical-lg":
          "0 1px 0 0 rgba(15, 23, 42, 0.04), 0 12px 32px -8px rgba(15, 23, 42, 0.12)",
        "trust-ring": "0 0 0 3px rgba(30, 64, 175, 0.18)",
        "inset-divider": "inset 0 -1px 0 0 #e2e8f0",
      },

      backgroundImage: {
        "grid-slate":
          "linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)",
        "trust-gradient":
          "linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%)",
        "verified-stripes":
          "repeating-linear-gradient(45deg, rgba(30,64,175,0.06) 0px, rgba(30,64,175,0.06) 6px, transparent 6px, transparent 12px)",
      },

      backgroundSize: {
        grid: "32px 32px",
      },

      keyframes: {
        "pulse-trust": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(30, 64, 175, 0.45)",
          },
          "50%": {
            boxShadow: "0 0 0 8px rgba(30, 64, 175, 0)",
          },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "ticker-blink": {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0.3" },
        },
      },

      animation: {
        "pulse-trust": "pulse-trust 2s ease-out infinite",
        "fade-up": "fade-up 0.35s ease-out both",
        "scan-line": "scan-line 2.4s linear infinite",
        "ticker-blink": "ticker-blink 1.4s steps(2, end) infinite",
      },

      transitionTimingFunction: {
        clinical: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },

      maxWidth: {
        "screen-2xl": "1440px",
      },
    },
  },
  plugins: [],
};

export default config;

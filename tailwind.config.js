/** @type {import('tailwindcss').Config} */
// Design tokens shared with the Spec Plan Editor (tech.riscv.org/plan/), the
// Specification Dashboard and the Specification Development Explorer. The
// values live as CSS variables in src/index.css; this maps them to utilities.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Built from template strings (t-${type}, tone-${tone}), so not seen by the scanner.
  safelist: [
    't-tsc', 't-gc', 't-ic', 't-hc', 't-tg', 't-sig', 't-other',
    'tone-blue', 'tone-red', 'tone-amber', 'tone-gray', 'tone-green',
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        line: "var(--border)",
        "line-strong": "var(--border-strong)",
        "line-firm": "var(--border-firm)",
        ink: "var(--text)",
        muted: "var(--muted)",
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          soft: "var(--brand-soft)",
        },
        gold: "var(--gold)",
        ok: { DEFAULT: "var(--ok)", bg: "var(--ok-bg)" },
        warn: { DEFAULT: "var(--warn)", bg: "var(--warn-bg)" },
        bad: { DEFAULT: "var(--bad)", bg: "var(--bad-bg)" },
        info: { DEFAULT: "var(--info)", bg: "var(--info-bg)" },
        neutral: { DEFAULT: "var(--neutral)", bg: "var(--neutral-bg)" },
        // Group types: the same colour on chips, charts and the graph.
        type: {
          tsc: "var(--type-tsc)",
          ic: "var(--type-ic)",
          hc: "var(--type-hc)",
          tg: "var(--type-tg)",
          sig: "var(--type-sig)",
        },
      },
      borderRadius: {
        card: "14px",
        control: "10px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.06)",
        pop: "0 2px 4px rgba(15,23,42,.06), 0 24px 48px rgba(15,23,42,.18)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
}

import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite resolves the `@/*` alias from tsconfig natively; JSX comes from the
  // tsconfig `"jsx": "react-jsx"` setting, so no React plugin is needed here.
  // (That also sidesteps @vitejs/plugin-react's Babel 8 peer conflict with the
  // shadcn CLI package.)
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

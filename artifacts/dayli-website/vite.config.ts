import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

/**
 * Adds an `X-Robots-Tag: noindex, nofollow` response header for any request
 * whose pathname starts with `/admin`. The /admin/leads SPA route is
 * intentionally excluded from prerendering and the sitemap, but search
 * engines still respect HTTP headers even when the page is JS-heavy. This
 * runs in both `dev` and `preview` and is reapplied by hosting providers
 * for the static build via deployment headers.
 */
function adminNoIndexHeader(): Plugin {
  const apply = (req: { url?: string }, res: { setHeader: (k: string, v: string) => void }) => {
    const url = req.url ?? "";
    const idx = url.indexOf("/admin");
    if (idx !== -1) {
      const after = url.charAt(idx + 6);
      if (after === "" || after === "/" || after === "?" || after === "#") {
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      }
    }
  };
  return {
    name: "dayli-admin-noindex",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        apply(req, res);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        apply(req, res);
        next();
      });
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    adminNoIndexHeader(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: true,
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: true,
    allowedHosts: true,
  },
});

/**
 * Site public de Céramodent (ceramodent.fr) : pages HTML statiques (référencement), sans framework.
 *  - npm run dev   → http://localhost:5190 (le formulaire est relayé vers l'API du dashboard lancée en local, port 4000)
 *  - npm run build → dist/ (vérifie qu'il ne reste aucune information « À compléter »)
 * La publication sur l'hébergement OVH passe par GitHub : voir .github/workflows/site.yml et README.md.
 */
import { resolve } from "node:path";
import { defineConfig } from "vite";

const here = (...p: string[]) => resolve(import.meta.dirname, ...p);

export default defineConfig({
  server: {
    port: 5190,
    proxy: { "/api": "http://localhost:4000" },
  },
  build: {
    rollupOptions: {
      input: {
        index: here("index.html"),
        fixe: here("prothese-fixe.html"),
        amovible: here("prothese-amovible.html"),
        implantaire: here("prothese-implantaire.html"),
        legal: here("mentions-legales.html"),
        notFound: here("404.html"),
      },
    },
  },
});

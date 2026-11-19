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
    // Le nom du dossier partagé gêne la surveillance des fichiers sous Windows : on vérifie à intervalles
    watch: { usePolling: true, interval: 300 },
  },
  build: {
    rollupOptions: {
      input: {
        index: here("index.html"),
        fixe: here("prothese-fixe.html"),
        amovible: here("prothese-amovible.html"),
        implantaire: here("prothese-implantaire.html"),
        numerique: here("empreintes-numeriques.html"),
        beaujolais: here("laboratoire-prothese-dentaire-beaujolais.html"),
        villefranche: here("laboratoire-prothese-dentaire-villefranche-sur-saone.html"),
        macon: here("laboratoire-prothese-dentaire-macon.html"),
        ain: here("laboratoire-prothese-dentaire-val-de-saone-ain.html"),
        zircone: here("couronne-zircone.html"),
        stellite: here("stellite.html"),
        complete: here("prothese-complete.html"),
        gouttieres: here("gouttieres-dentaires.html"),
        rebasage: here("rebasage-prothese-dentaire.html"),
        laboratoire: here("le-laboratoire.html"),
        guideScan: here("guide-scan-intra-oral.html"),
        guideAmovible: here("guide-reparation-prothese-amovible.html"),
        guideComplete: here("guide-etapes-prothese-complete.html"),
        guideImmediate: here("guide-prothese-immediate.html"),
        guideStabilisee: here("guide-prothese-complete-stabilisee-implants.html"),
        guides: here("guides.html"),
        legal: here("mentions-legales.html"),
        notFound: here("404.html"),
      },
    },
  },
});

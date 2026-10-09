// Pages publiques de Ceramodent : HTML statique (référencement). Ce script apporte les polices de la charte,
// les styles, le consentement et la mesure d'audience (Google seulement après « Accepter »), le formulaire de
// demande et l'année du pied de page.
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/barlow-semi-condensed/400.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "./style.css";
import { initConsent } from "./consent.ts";
import { initTracking } from "./tracking.ts";
import "./form.ts";

initConsent();
initTracking();

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

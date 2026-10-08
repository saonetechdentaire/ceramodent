// Pages publiques de Ceramodent : HTML statique (référencement). Ce script apporte les polices de la charte,
// les styles, le formulaire de demande et l'année du pied de page. Aucun cookie, aucune mesure d'audience.
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/barlow-semi-condensed/400.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "./style.css";
import "./form.ts";

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

/**
 * Plan de marquage de ceramodent.fr : les actions qui comptent pour le labo, poussées dans le dataLayer de
 * Google Tag Manager via track() (donc seulement après consentement, voir consent.ts). Dans GTM, chaque nom
 * d'événement a un déclencheur « Événement personnalisé » et une balise « Événement GA4 » (voir gtm/).
 * Une seule écoute des clics pour toute la page : tout lien tel:, mailto:, d'itinéraire ou vers le formulaire
 * est mesuré, où qu'il soit ajouté.
 *
 * | Événement        | Quand                                         | Paramètres                    | Conversion |
 * |------------------|-----------------------------------------------|-------------------------------|------------|
 * | generate_lead    | demande envoyée avec succès (form.ts)         | form, profession              | oui        |
 * | phone_click      | clic sur un numéro de téléphone               | link_location                 | oui        |
 * | email_click      | clic sur une adresse e-mail                   | link_location                 | oui        |
 * | form_error       | envoi refusé ou connexion impossible (form.ts)| reason                        |            |
 * | directions_click | clic sur « Itinéraire »                       | link_location                 |            |
 * | cta_click        | clic sur « Confier un cas », « Contact »…     | cta, link_location            |            |
 * | faq_open         | ouverture d'une question fréquente            | question                      |            |
 * | service_view     | arrivée sur une page fixe / amovible / implantaire | service                  |            |
 *
 * link_location : « header », « footer », « hero » ou l'id de la section (contact, questions…).
 * Jamais de nom, de téléphone, d'e-mail ni de message : rien qui identifie une personne.
 */
import { track } from "./consent.ts";

function locationOf(el: Element) {
  if (el.closest("header")) return "header";
  if (el.closest("footer")) return "footer";
  if (el.closest(".hero")) return "hero";
  return el.closest("section[id]")?.id ?? el.closest("section")?.querySelector("h2[id]")?.id?.replace(/^t-/, "") ?? "page";
}

export function initTracking() {
  document.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") ?? "";
    const link_location = locationOf(link);
    if (href.startsWith("tel:")) track("phone_click", { link_location });
    else if (href.startsWith("mailto:")) track("email_click", { link_location });
    else if (/google\.[a-z.]+\/maps/.test(href)) track("directions_click", { link_location });
    else if (/^\/?#contact$/.test(href)) track("cta_click", { cta: link.textContent?.trim() ?? "contact", link_location });
  });

  // Questions fréquentes : seulement à l'ouverture
  for (const item of document.querySelectorAll<HTMLDetailsElement>("details.faq__item")) {
    item.addEventListener("toggle", () => {
      if (item.open) track("faq_open", { question: item.querySelector("summary")?.textContent?.trim() ?? "" });
    });
  }

  // Pages des travaux
  const service = /^\/prothese-(fixe|amovible|implantaire)\.html$/.exec(location.pathname)?.[1];
  if (service) track("service_view", { service });
}

/**
 * Mesure d'audience soumise au consentement, conforme aux recommandations de la CNIL :
 *  - Google Tag Manager (qui porte la balise GA4) n'est chargé qu'après « Accepter » : rien chez Google avant ;
 *  - « Refuser » est aussi simple qu'« Accepter », le choix est gardé 6 mois puis redemandé ;
 *  - « Gérer les cookies » (pied de page) rouvre le bandeau ; un refus après coup efface les cookies Google ;
 *  - mode consentement Google : mesure d'audience autorisée, publicité toujours refusée.
 * Pas de balise <noscript> de GTM : sans JavaScript, impossible de demander l'accord, donc rien n'est chargé.
 * Les réglages GA4 (cookies 13 mois, signaux Google désactivés) se font dans la balise GA4 de GTM.
 * L'identifiant GTM vient de .env.production (VITE_GTM_ID) : en local il est vide, les événements s'affichent dans la console.
 * Même fonctionnement que tech-dentaire.fr, avec un conteneur GTM et une propriété GA4 propres à Céramodent.
 */

type Choice = "granted" | "denied";
type Stored = { choice: Choice; at: number; v: number };
type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined;
const KEY = "ceramodent-consent";
const VERSION = 1; // à incrémenter si la finalité change : le bandeau est alors redemandé
const MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000; // 6 mois

function readChoice(): Choice | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (s.v !== VERSION || Date.now() - s.at > MAX_AGE_MS) return null;
    return s.choice;
  } catch {
    return null;
  }
}

function saveChoice(choice: Choice) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ choice, at: Date.now(), v: VERSION } satisfies Stored));
  } catch {
    // Stockage bloqué (navigation privée stricte) : le bandeau reviendra à la prochaine page, sans gêner la visite
  }
}

/* ---------- Google Tag Manager ---------- */

let loaded = false;

function loadTagManager() {
  if (loaded || !GTM_ID) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // Les commandes « consent » doivent être poussées sous forme d'objet « arguments », comme le fait gtag.js
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  // Mode consentement Google, avant le chargement de GTM : mesure d'audience autorisée, publicité toujours refusée
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  document.head.append(script);
}

/** Efface les cookies Google Analytics (_ga, _ga_XXXX) sur ce domaine et son domaine parent */
function clearAnalyticsCookies() {
  const parts = location.hostname.split(".");
  const domains = ["", location.hostname, ...parts.map((_, i) => "." + parts.slice(i).join(".")).filter((d) => d.split(".").length > 2)];
  for (const name of document.cookie.split(";").map((c) => c.split("=")[0]!.trim())) {
    if (!name.startsWith("_ga")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

/**
 * Événement de mesure (ex. « phone_click »), poussé dans le dataLayer de GTM : un déclencheur
 * « Événement personnalisé » du même nom l'envoie à GA4. Seulement si le visiteur a accepté ;
 * en local (sans identifiant GTM), affiché dans la console pour vérifier le marquage.
 */
export function track(event: string, params: Params = {}) {
  if (!GTM_ID) {
    if (import.meta.env.DEV) console.info(`[mesure] ${event}`, params, readChoice() === "granted" ? "(accepté)" : "(non envoyé : pas de consentement)");
    return;
  }
  if (loaded) window.dataLayer.push({ event, ...params });
}

/* ---------- Bandeau ---------- */

function apply(choice: Choice) {
  saveChoice(choice);
  if (choice === "granted") loadTagManager();
  else if (loaded) {
    // Retrait du consentement : Google n'écrit plus rien, les cookies déjà posés sont effacés,
    // et la page est rechargée pour que GTM ne tourne plus du tout
    window.gtag("consent", "update", { analytics_storage: "denied" });
    clearAnalyticsCookies();
    location.reload();
  } else clearAnalyticsCookies();
}

function showBanner() {
  if (document.getElementById("consent")) return;
  const banner = document.createElement("section");
  banner.id = "consent";
  banner.className = "consent";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-labelledby", "consent-title");
  banner.innerHTML = `
    <div class="consent__text">
      <p id="consent-title" class="consent__title">Mesure d'audience</p>
      <p>
        Avec votre accord, nous utilisons Google Analytics pour savoir combien de personnes visitent le site et quelles
        pages les intéressent. Aucune publicité. Vous pouvez changer d'avis à tout moment (« Gérer les cookies », en bas de page).
        <a href="/mentions-legales.html#cookies">En savoir plus</a>
      </p>
    </div>
    <div class="consent__actions">
      <button type="button" class="btn btn--quiet" data-consent="denied">Refuser</button>
      <button type="button" class="btn" data-consent="granted">Accepter</button>
    </div>`;
  banner.addEventListener("click", (e) => {
    const choice = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-consent]")?.dataset.consent as Choice | undefined;
    if (!choice) return;
    banner.remove();
    apply(choice);
  });
  document.body.append(banner);
}

/** À appeler une fois au chargement de chaque page publique */
export function initConsent() {
  const choice = readChoice();
  if (choice === "granted") loadTagManager();
  if (!choice) showBanner();

  // « Gérer les cookies » : rouvre le bandeau
  document.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest("[data-consent-open]")) return;
    e.preventDefault();
    showBanner();
    document.querySelector<HTMLButtonElement>("#consent [data-consent='granted']")?.focus();
  });
}

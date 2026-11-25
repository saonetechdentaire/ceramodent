/**
 * Mesure soumise au consentement, conforme aux recommandations de la CNIL :
 *  - deux finalités, au choix : mesure d'audience (Google Analytics) et mesure publicitaire (savoir si un appel ou une
 *    demande de devis vient d'une annonce Google Ads) ; « Tout accepter » et « Tout refuser » aussi simples l'un que
 *    l'autre, « Choisir » pour n'en garder qu'une ;
 *  - Google Tag Manager n'est chargé qu'après un accord : rien chez Google avant ;
 *  - le choix est gardé 6 mois puis redemandé ; « Gérer les cookies » (pied de page) rouvre le bandeau ;
 *    un retrait après coup efface les cookies Google concernés ;
 *  - mode consentement Google : analytics_storage selon l'audience, ad_storage et ad_user_data selon la mesure
 *    publicitaire, ad_personalization toujours refusé (pas de ciblage ni de remarketing).
 * Pas de balise <noscript> de GTM : sans JavaScript, impossible de demander l'accord, donc rien n'est chargé.
 * Les réglages GA4 (cookies 13 mois, signaux Google désactivés) se font dans la balise GA4 de GTM.
 * L'identifiant GTM vient de .env.production (VITE_GTM_ID) : en local il est vide, les événements s'affichent dans la console.
 * Même fonctionnement que tech-dentaire.fr, avec un conteneur GTM, une propriété GA4 et un compte Google Ads propres à Céramodent.
 */

type Choice = { analytics: boolean; ads: boolean };
type Stored = Choice & { at: number; v: number };
type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined;
const KEY = "ceramodent-consent";
// À incrémenter si les finalités changent : le bandeau est alors redemandé (2 : ajout de la mesure des annonces Google Ads)
const VERSION = 2;
const MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000; // 6 mois

function readChoice(): Choice | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (s.v !== VERSION || Date.now() - s.at > MAX_AGE_MS) return null;
    return { analytics: s.analytics === true, ads: s.ads === true };
  } catch {
    return null;
  }
}

function saveChoice(choice: Choice) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...choice, at: Date.now(), v: VERSION } satisfies Stored));
  } catch {
    // Stockage bloqué (navigation privée stricte) : le bandeau reviendra à la prochaine page, sans gêner la visite
  }
}

const consentState = (c: Choice) => ({
  analytics_storage: c.analytics ? "granted" : "denied",
  ad_storage: c.ads ? "granted" : "denied",
  ad_user_data: c.ads ? "granted" : "denied",
  ad_personalization: "denied",
});

/* ---------- Google Tag Manager ---------- */

let loaded = false;

function loadTagManager(choice: Choice) {
  if (loaded || !GTM_ID) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // Les commandes « consent » doivent être poussées sous forme d'objet « arguments », comme le fait gtag.js
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  // Mode consentement Google, avant le chargement de GTM : ce que le visiteur a accepté, rien de plus
  window.gtag("consent", "default", consentState(choice));
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  document.head.append(script);
}

/** Efface les cookies Google dont les préfixes sont donnés (_ga : audience, _gcl : publicité) sur ce domaine et son parent */
function clearCookies(prefixes: string[]) {
  if (!prefixes.length) return;
  const parts = location.hostname.split(".");
  const domains = ["", location.hostname, ...parts.map((_, i) => "." + parts.slice(i).join(".")).filter((d) => d.split(".").length > 2)];
  for (const name of document.cookie.split(";").map((c) => c.split("=")[0]!.trim())) {
    if (!prefixes.some((p) => name.startsWith(p))) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

/**
 * Événement de mesure (ex. « phone_click »), poussé dans le dataLayer de GTM : un déclencheur
 * « Événement personnalisé » du même nom l'envoie à GA4 (et à Google Ads s'il est importé en conversion).
 * Seulement si le visiteur a accepté au moins une mesure ; en local (sans identifiant GTM), affiché dans la console.
 */
export function track(event: string, params: Params = {}) {
  if (!GTM_ID) {
    if (import.meta.env.DEV) {
      const c = readChoice();
      console.info(`[mesure] ${event}`, params, c && (c.analytics || c.ads) ? `(accepté : ${JSON.stringify(c)})` : "(non envoyé : pas de consentement)");
    }
    return;
  }
  if (loaded) window.dataLayer.push({ event, ...params });
}

/* ---------- Bandeau ---------- */

function apply(choice: Choice) {
  const before = readChoice();
  saveChoice(choice);
  const withdrawn = [...(!choice.analytics ? ["_ga"] : []), ...(!choice.ads ? ["_gcl"] : [])];
  if (!loaded) {
    clearCookies(withdrawn);
    if (choice.analytics || choice.ads) loadTagManager(choice);
    return;
  }
  window.gtag("consent", "update", consentState(choice));
  // Retrait d'un accord déjà donné : les cookies concernés sont effacés et la page rechargée, pour que rien ne tourne plus
  if ((before?.analytics && !choice.analytics) || (before?.ads && !choice.ads)) {
    clearCookies(withdrawn);
    location.reload();
  }
}

function showBanner() {
  if (document.getElementById("consent")) return;
  const current = readChoice();
  const banner = document.createElement("section");
  banner.id = "consent";
  banner.className = "consent";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-labelledby", "consent-title");
  banner.innerHTML = `
    <div class="consent__text">
      <p id="consent-title" class="consent__title">Mesure d'audience et des annonces</p>
      <p>
        Avec votre accord, nous utilisons Google Analytics pour savoir quelles pages intéressent les visiteurs, et Google Ads
        pour savoir si un appel ou une demande de devis vient de nos annonces. Pas de publicité ciblée. Vous pouvez changer
        d'avis à tout moment (« Gérer les cookies », en bas de page).
        <a href="/mentions-legales.html#cookies">En savoir plus</a>
      </p>
      <form class="consent__choices" hidden>
        <label><input type="checkbox" name="analytics" ${current?.analytics ? "checked" : ""} /> Mesure d'audience (Google Analytics)</label>
        <label><input type="checkbox" name="ads" ${current?.ads ? "checked" : ""} /> Mesure des annonces (Google Ads)</label>
      </form>
    </div>
    <div class="consent__actions">
      <button type="button" class="btn btn--quiet" data-consent="none">Tout refuser</button>
      <button type="button" class="btn btn--quiet" data-consent="pick">Choisir</button>
      <button type="button" class="btn" data-consent="all">Tout accepter</button>
    </div>`;
  const form = banner.querySelector<HTMLFormElement>(".consent__choices")!;
  banner.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-consent]");
    if (!button) return;
    const action = button.dataset.consent;
    if (action === "pick") {
      // Premier clic : affiche les cases ; second clic (« Enregistrer ») : garde ce qui est coché
      if (form.hidden) {
        form.hidden = false;
        button.textContent = "Enregistrer";
        form.querySelector("input")?.focus();
        return;
      }
      banner.remove();
      const checked = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).checked;
      apply({ analytics: checked("analytics"), ads: checked("ads") });
      return;
    }
    banner.remove();
    apply(action === "all" ? { analytics: true, ads: true } : { analytics: false, ads: false });
  });
  document.body.append(banner);
}

/** À appeler une fois au chargement de chaque page publique */
export function initConsent() {
  const choice = readChoice();
  if (choice && (choice.analytics || choice.ads)) loadTagManager(choice);
  if (!choice) {
    showBanner();
  }

  // « Gérer les cookies » : rouvre le bandeau
  document.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest("[data-consent-open]")) return;
    e.preventDefault();
    showBanner();
    document.querySelector<HTMLButtonElement>("#consent [data-consent='all']")?.focus();
  });
}

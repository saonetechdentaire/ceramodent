// Génère gtm/conteneur-ceramodent.json, à importer dans GTM (Admin → Importer un conteneur → Fusionner).
//   node gtm/generer-conteneur.mjs G-XXXXXXXXXX
// Une balise GA4 par événement du plan de marquage (src/tracking.ts), et rien ne part depuis la préprod ni
// depuis le poste de développement : toutes les balises ne se déclenchent que sur ceramodent.fr.
import { writeFileSync } from "node:fs";

const GA4 = process.argv[2];
if (!/^G-[A-Z0-9]+$/.test(GA4 ?? "")) {
  console.error("Usage : node gtm/generer-conteneur.mjs G-XXXXXXXXXX (identifiant de mesure du flux GA4 de ceramodent.fr)");
  process.exit(1);
}
const HOST = "ceramodent.fr";

// Événement → paramètres envoyés à GA4 (mêmes noms que dans tracking.ts et form.ts)
const EVENTS = {
  generate_lead: ["form", "profession"],
  phone_click: ["link_location"],
  email_click: ["link_location"],
  form_error: ["reason"],
  directions_click: ["link_location"],
  cta_click: ["cta", "link_location"],
  faq_open: ["question"],
  service_view: ["service"],
};

const base = { accountId: "0", containerId: "0", fingerprint: "0" };
const T = (key, value) => ({ type: "TEMPLATE", key, value });
const onSite = { type: "EQUALS", parameter: [T("arg0", "{{Page Hostname}}"), T("arg1", HOST)] };
const params = (names) => ({
  type: "LIST",
  key: "eventSettingsTable",
  list: names.map((n) => ({ type: "MAP", map: [T("parameter", n), T("parameterValue", `{{DLV - ${n}}}`)] })),
});
const tagCommon = { tagFiringOption: "ONCE_PER_EVENT", monitoringMetadata: { type: "MAP" }, consentSettings: { consentStatus: "NOT_SET" } };

const triggers = [
  { ...base, triggerId: "1", name: `Toutes les pages – ${HOST}`, type: "PAGEVIEW", filter: [onSite] },
  ...Object.keys(EVENTS).map((ev, i) => ({
    ...base,
    triggerId: String(i + 2),
    name: `Événement – ${ev}`,
    type: "CUSTOM_EVENT",
    customEventFilter: [{ type: "EQUALS", parameter: [T("arg0", "{{_event}}"), T("arg1", ev)] }],
    filter: [onSite],
  })),
];

const tags = [
  {
    ...base,
    tagId: "1",
    name: `GA4 – Google tag (${GA4})`,
    type: "googtag",
    parameter: [
      T("tagId", GA4),
      {
        type: "LIST",
        key: "configSettingsTable",
        list: [
          ["cookie_expires", "33696000"], // 13 mois (CNIL)
          ["allow_google_signals", "false"],
          ["allow_ad_personalization_signals", "false"],
        ].map(([p, v]) => ({ type: "MAP", map: [T("parameter", p), T("parameterValue", v)] })),
      },
    ],
    firingTriggerId: ["1"],
    ...tagCommon,
  },
  ...Object.entries(EVENTS).map(([ev, names], i) => ({
    ...base,
    tagId: String(i + 2),
    name: `GA4 – ${ev}`,
    type: "gaawe",
    parameter: [T("eventName", ev), T("measurementIdOverride", GA4), { type: "BOOLEAN", key: "sendEcommerceData", value: "false" }, params(names)],
    firingTriggerId: [String(i + 2)],
    ...tagCommon,
  })),
];

const dlvNames = [...new Set(Object.values(EVENTS).flat())];
const variables = dlvNames.map((n, i) => ({
  ...base,
  variableId: String(i + 1),
  name: `DLV - ${n}`,
  type: "v",
  parameter: [{ type: "INTEGER", key: "dataLayerVersion", value: "2" }, { type: "BOOLEAN", key: "setDefaultValue", value: "false" }, T("name", n)],
  formatValue: {},
}));

const container = {
  exportFormatVersion: 2,
  exportTime: new Date().toISOString().replace("T", " ").slice(0, 19),
  containerVersion: {
    path: "accounts/0/containers/0/versions/0",
    accountId: "0",
    containerId: "0",
    containerVersionId: "0",
    container: { path: "accounts/0/containers/0", accountId: "0", containerId: "0", name: HOST, publicId: "GTM-N95BFSZ9", usageContext: ["WEB"], fingerprint: "0" },
    tag: tags,
    trigger: triggers,
    variable: variables,
    // Variables intégrées : celles activées par défaut dans un conteneur neuf (sinon l'import les supprime) + Page Hostname
    builtInVariable: [
      ["PAGE_URL", "Page URL"],
      ["PAGE_HOSTNAME", "Page Hostname"],
      ["PAGE_PATH", "Page Path"],
      ["REFERRER", "Referrer"],
      ["EVENT", "Event"],
    ].map(([type, name]) => ({ accountId: "0", containerId: "0", type, name })),
    fingerprint: "0",
  },
};

const out = new URL("./conteneur-ceramodent.json", import.meta.url);
writeFileSync(out, JSON.stringify(container, null, 2) + "\n");
console.log(`✔ ${out.pathname} : ${tags.length} balises, ${triggers.length} déclencheurs, ${variables.length} variables (${GA4})`);

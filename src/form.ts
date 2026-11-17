/**
 * Formulaire de demande : envoyé à l'API du dashboard du labo (même API que le formulaire de tech-dentaire.fr),
 * avec site = « ceramodent » pour que la demande soit étiquetée Ceramodent dans le dashboard.
 * L'adresse de l'API vient de .env.production ; en local, Vite relaie /api vers l'API lancée sur le port 4000.
 * Côté serveur, ceramodent.fr doit figurer dans SITE_ORIGINS (api/.env du VPS), sinon le navigateur bloque l'envoi.
 */
import { track } from "./consent.ts";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

const form = document.getElementById("devis-form") as HTMLFormElement | null;
const status = form?.querySelector<HTMLParagraphElement>("[role=status]");
const button = form?.querySelector<HTMLButtonElement>("button[type=submit]");

function show(message: string, tone: "ok" | "error") {
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
  status.hidden = false;
}

// Jeton anti-robots : demandé dès que le visiteur commence à remplir (l'API vérifie qu'il ne remplit pas en 3 s)
let token: Promise<string> | null = null;
const getToken = () =>
  (token ??= fetch(`${API_URL}/api/contact/token`)
    .then((r) => (r.ok ? (r.json() as Promise<{ token: string }>) : { token: "" }))
    .then((d) => d.token)
    .catch(() => ""));
form?.addEventListener("focusin", () => void getToken(), { once: true });
// …ou dès que le formulaire apparaît à l’écran : un visiteur met toujours plus de 3 s à le remplir
if (form && "IntersectionObserver" in window) {
  const seen = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      seen.disconnect();
      void getToken();
    }
  });
  seen.observe(form);
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity() || !button) return;

  button.disabled = true;
  button.textContent = "Envoi…";
  try {
    const res = await fetch(`${API_URL}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), token: await getToken() }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (res.status === 429) throw new Error("Trop de demandes envoyées depuis cette connexion. Réessayez plus tard ou appelez-nous.");
    if (!res.ok) throw new Error(data?.error ?? "L'envoi a échoué. Réessayez ou appelez-nous.");
    // Conversion principale du site (mesurée seulement après consentement). La profession n'identifie personne.
    track("generate_lead", { form: "contact", profession: String(new FormData(form).get("profession") ?? "") });
    form.reset();
    token = null; // un jeton par demande
    show("Merci, votre demande est bien arrivée au laboratoire. Nous vous rappelons rapidement.", "ok");
  } catch (err) {
    track("form_error", { reason: err instanceof TypeError ? "connexion" : "refus" });
    // Le numéro affiché dans la section contact, pour ne le tenir qu'à un endroit
    const phone = document.querySelector(".contact__phone")?.textContent?.trim();
    show(
      err instanceof TypeError ? `Connexion impossible. Réessayez${phone ? ` ou appelez-nous au ${phone}` : ""}.` : (err as Error).message,
      "error",
    );
  } finally {
    button.disabled = false;
    button.textContent = "Envoyer la demande";
  }
});

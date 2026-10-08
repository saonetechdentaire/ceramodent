/**
 * Formulaire de demande : envoyé à l'API du dashboard du labo (même API que le formulaire de tech-dentaire.fr),
 * avec site = « ceramodent » pour que la demande soit étiquetée Ceramodent dans le dashboard.
 * L'adresse de l'API vient de .env.production ; en local, Vite relaie /api vers l'API lancée sur le port 4000.
 * Côté serveur, ceramodent.fr doit figurer dans SITE_ORIGINS (api/.env du VPS), sinon le navigateur bloque l'envoi.
 */
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

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity() || !button) return;

  button.disabled = true;
  button.textContent = "Envoi…";
  try {
    const res = await fetch(`${API_URL}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (res.status === 429) throw new Error("Trop de demandes envoyées depuis cette connexion. Réessayez plus tard ou appelez-nous.");
    if (!res.ok) throw new Error(data?.error ?? "L'envoi a échoué. Réessayez ou appelez-nous.");
    form.reset();
    show("Merci, votre demande est bien arrivée au laboratoire. Nous vous rappelons rapidement.", "ok");
  } catch (err) {
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

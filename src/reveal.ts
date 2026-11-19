// Animations des pages publiques (Motion, version légère), dans le style éditorial du site.
// Les titres montent mot à mot derrière un masque, les filets des listes se tracent de gauche à droite, chaque
// ligne glisse en fondu quand elle arrive à l'écran. Seuls les éléments encore sous l'écran au chargement sont
// préparés, donc le haut de page ne clignote pas (son entrée est en CSS), et sans JavaScript tout reste visible.
import { animate } from "motion/mini";
import { inView, stagger } from "motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const TITLES = [".section h2", ".legal > h2"];
const RULES = ".rows";
const BLOCKS = [
  ".section__head > p",
  ".about__figure",
  ".about__text > p",
  ".row",
  ".faq__item",
  ".columns > div",
  ".checklist",
  ".more",
  ".contact-intro",
  ".contact-grid > *",
  ".section .wrap > p",
  ".legal > p",
  ".legal > ul",
  ".legal > ol",
];

// Découpe un titre en mots, chacun dans un masque : <span class="w"><span>mot</span></span>
function splitWords(el: HTMLElement): HTMLElement[] {
  const inner: HTMLElement[] = [];
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of (child.textContent ?? "").split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.append(part);
            continue;
          }
          const mask = document.createElement("span");
          const word = document.createElement("span");
          mask.className = "w";
          word.textContent = part;
          mask.append(word);
          frag.append(mask);
          inner.push(word);
        }
        child.replaceWith(frag);
      } else if (child instanceof HTMLElement && child.tagName !== "BR") {
        walk(child);
      }
    }
  };
  walk(el);
  return inner;
}

export function initReveal() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const below = (el: Element) => el.getBoundingClientRect().top > window.innerHeight * 0.92;
  const opts = { margin: "0px 0px -10% 0px" } as const;
  const pending = new Map<HTMLElement, () => void>();
  const taken = new Set<Element>();

  const watch = (el: HTMLElement, run: () => { then(done: () => void): unknown }, finish: () => void) => {
    pending.set(el, finish);
    inView(
      el,
      () => {
        if (!pending.delete(el)) return;
        run().then(finish);
      },
      opts,
    );
  };

  // Filets des listes : tracés de gauche à droite (CSS, classe « is-in »)
  document.querySelectorAll<HTMLElement>(RULES).forEach((el) => {
    if (reduce || !below(el)) return;
    el.classList.add("is-rule");
    pending.set(el, () => el.classList.add("is-in"));
    inView(el, () => {
      if (pending.delete(el)) el.classList.add("is-in");
    }, opts);
  });

  if (reduce) {
    document.querySelectorAll<HTMLElement>([...TITLES, ...BLOCKS].join(",")).forEach((el) => {
      if (taken.has(el) || !below(el)) return;
      taken.add(el);
      el.style.opacity = "0";
      watch(el, () => animate(el, { opacity: [0, 1] }, { duration: 0.6 }), () => (el.style.opacity = ""));
    });
  } else {
    document.querySelectorAll<HTMLElement>(TITLES.join(",")).forEach((el) => {
      if (taken.has(el) || !below(el)) return;
      taken.add(el);
      const words = splitWords(el);
      words.forEach((w) => (w.style.transform = "translateY(110%)"));
      watch(
        el,
        () => animate(words, { transform: ["translateY(110%)", "translateY(0)"] }, { duration: 0.9, ease: EASE, delay: stagger(0.045) }),
        () => words.forEach((w) => (w.style.transform = "")),
      );
    });

    document.querySelectorAll<HTMLElement>(BLOCKS.join(",")).forEach((el) => {
      if (taken.has(el) || !below(el) || [...taken].some((t) => t.contains(el))) return;
      taken.add(el);
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      watch(
        el,
        () => animate(el, { opacity: [0, 1], transform: ["translateY(24px)", "translateY(0)"] }, { duration: 0.9, ease: EASE }),
        () => {
          el.style.opacity = "";
          el.style.removeProperty("transform");
        },
      );
    });
  }

  // Sécurité : un élément déjà dépassé (saut vers une ancre, défilement très rapide) s'affiche tout de suite
  window.addEventListener(
    "scroll",
    () =>
      pending.forEach((finish, el) => {
        if (el.getBoundingClientRect().bottom < 0) {
          pending.delete(el);
          finish();
        }
      }),
    { passive: true },
  );
}

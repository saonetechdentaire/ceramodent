# Ceramodent — site public (ceramodent.fr)

Site vitrine du laboratoire de prothèse dentaire Ceramodent (Belleville-en-Beaujolais) : deux pages HTML
statiques (accueil, mentions légales), sans cookie. Le formulaire de demande envoie à l'API du dashboard du labo (prod.tech-dentaire.fr, voir src/form.ts) : `https://ceramodent.fr` et `https://pre.ceramodent.fr` doivent figurer dans `SITE_ORIGINS` (api/.env du VPS). Vite + TypeScript. Identité selon la charte graphique (STD/Ceramodent/Ceramodent.pdf) : bleu #3535A8, orange #FF7A00, crème #FEFFE9 ; titres en Bricolage Grotesque, textes en Barlow Semi Condensed (à la place de Loos Condensed, police payante).

```
index.html               Accueil (contenu + données structurées LocalBusiness / WebSite / FAQPage)
prothese-*.html          Pages fixe, amovible, implantaire (Service + fil d'Ariane)
404.html                 Page « introuvable » (ErrorDocument du .htaccess)
mentions-legales.html    Mentions légales
src/                     Styles, formulaire de demande (form.ts), année du pied de page
public/                  Icônes, image de partage, robots.txt, sitemap.xml, .htaccess (copiés tels quels)
seo/                     Variantes de la préprod (robots.txt, .htaccess « noindex »)
scripts/check-site.mjs   Liste les « À compléter » restants (bloque la mise en ligne)
```

## Travailler en local

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/ + liste des informations « À compléter »
```

## Informations à compléter avant la mise en ligne

Surlignées en jaune dans les pages, et listées par `npm run build` :
- téléphone et e-mail (texte affiché, liens `tel:` / `mailto:` et `A_COMPLETER_…` dans les données structurées de `index.html`) ;
- mentions légales : capital social, ville du RCS (Kbis), n° de TVA, directeur de la publication.

## Mise en ligne (GitHub → OVH)

Publication (`.github/workflows/site.yml`) :
- `git push origin main` → branche **`pre-prod`** → `pre.ceramodent.fr`, à chaque fois, invisible des moteurs ;
- `git push origin main:prod`, quand on décide de mettre en ligne → branche **`site-public`** → `ceramodent.fr`,
  seulement s'il ne reste aucun « À compléter ».

La production attend l'accord d'un responsable : GitHub → Settings → Environments → **`production`** →
« Required reviewers » (les personnes qui peuvent approuver) et « Prevent self-review » décoché. Après un
`git push origin main:prod`, la mise en ligne reste « Waiting » dans l'onglet Actions jusqu'au clic sur
« Review deployments » → « Approve and deploy ». Pour en plus empêcher les autres de pousser sur `prod` :
Settings → Rules → Rulesets → nouvelle règle sur la branche `prod`, « Restrict updates », avec soi-même en
« Bypass list ».

Côté OVH (Hébergement → Multisite, puis Git) :
- `ceramodent.fr` et `www.ceramodent.fr` (SSL activé) → un dossier vide, relié à la branche **`site-public`** ;
- `pre.ceramodent.fr` → un autre dossier vide, relié à la branche **`pre-prod`** ;
- dépôt `git@github.com:<compte>/ceramodent.git` ; clé SSH d'OVH → GitHub → Settings → Deploy keys (lecture seule) ;
- webhook OVH → GitHub → Settings → Webhooks (« Just the push event ») pour que chaque publication arrive seule.

⚠️ Ne jamais relier `main` : OVH publierait le code source.

## Après la mise en ligne

- Google Search Console et Bing Webmaster Tools : ajouter `https://ceramodent.fr/sitemap.xml`.
- Fiche Google Business Profile : lien `https://ceramodent.fr`, même nom, adresse et téléphone que le site.

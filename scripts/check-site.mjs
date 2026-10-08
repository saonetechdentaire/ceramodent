// Après `npm run build` : liste les informations « À compléter » restantes, pour ne pas les publier par erreur.
// STRICT=1 (publication automatique sur GitHub) : bloque la mise en ligne tant qu'il en reste.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../dist/", import.meta.url));
let total = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(join(dir, file), "utf8");
  const todos = [
    ...[...html.matchAll(/<span class="todo">([\s\S]*?)<\/span>/g)].map((m) => m[1].replace(/\s+/g, " ").trim()),
    // Valeurs provisoires dans les liens et les données lues par Google (ex. tel:A_COMPLETER_TELEPHONE)
    ...[...html.matchAll(/A_COMPLETER_[A-Z]+/g)].map((m) => `${m[0]} (lien ou données Google)`),
  ];
  if (!todos.length) continue;
  total += todos.length;
  console.log(`\n⚠️  ${file} : ${todos.length} information(s) à compléter`);
  for (const t of todos) console.log(`   • ${t}`);
}
console.log(total ? `\n→ ${total} trou(s) à combler avant de publier.\n` : "\n✔ Aucune information à compléter : prêt à publier.\n");
if (total && process.env.STRICT === "1") {
  console.error("❌ Publication bloquée : complétez les informations ci-dessus.");
  process.exit(1);
}

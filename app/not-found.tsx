// not-found global (hors segment [locale]) — doit fournir son propre <html>/<body>
// car aucun layout racine ne l'encadre (le root layout vit sous app/[locale]).
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body>
        <main className="mx-auto max-w-md p-8">
          <h1 className="text-2xl font-semibold">404 — Page introuvable</h1>
        </main>
      </body>
    </html>
  );
}
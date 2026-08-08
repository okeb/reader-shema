# Doodles — assets Rive (spec 18)

Déposer ici les fichiers `.riv` des doodles, nommés par l'`id` de l'occasion
(cf. `lib/doodles.ts` → `animate.file`).

Ex. : occasion `id: "pessah"` avec `animate.file: "/doodle/pessah.riv"` →
fichier `public/doodle/pessah.riv`.

## Authoring

- Créer l'animation dans l'éditeur `rive.app` (gratuit) : dessin vectoriel + state
  machine + variables de couleur `light`/`dark`.
- **Un seul `.riv`** par occasion (thème runtime surchargé selon `.dark` — pas de
  doublon `_light`/`_dark`, cf. spec §4.4).
- State machine d'entrée : état joué au montage (1×/jour). État `hover` optionnel
  (survol desktop).
- Respecter AA sur fonds clair et sombre.

## Sans art

Tant qu'un `.riv` manque, le renderer repli silencieusement sur le logo normal
(spec §4.5) — aucune erreur visible. Pour tester localement : inscrire une
occasion couvrant aujourd'hui dans `lib/doodles.ts` et déposer le `.riv`
correspondant ici.
'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useRive, Fit, Alignment, Layout, type RiveState } from '@rive-app/react-canvas';
import { cn } from '@/lib/utils';
import { useDoodleSeen } from '@/src/presentation/stores/doodle-seen.store';
import type { DoodleAnimation } from '@/src/shared/constants/doodles';

export interface DoodleRendererProps {
  /** Slug du doodle (sert à la persistance `seen` et au keying). */
  id: string;
  /** Animation Rive déclarée par l'occasion. */
  animate: DoodleAnimation;
  /** Label exposé aux lecteurs d'écran (le canvas n'a pas de DOM textuel). */
  label: string;
  /** Mode focus → rendu discret, aucune animation d'entrée (spec §4.5). */
  focus?: boolean;
  className?: string;
  /** Appelé si l'asset `.riv` ne charge pas (404, runtime cassé) — le parent repli sur le logo normal. */
  onError?: () => void;
}

/**
 * Renderer Rive d'un doodle (spec 18 §4.4 / §6.1).
 *
 * Monte un `.riv` sur `<canvas>` via `@rive-app/react-canvas` (runtime WASM). Gère :
 * - **State machine** : si l'occasion déclare `animate.stateMachine`, on la passe à `useRive` ;
 *   sinon on détecte la 1ʳᵉ SM de l'artboard au `onRiveReady` et on la joue. Sans ça, `useRive` ne
 *   joue que la timeline principale (souvent vide) et le `.riv` reste figé.
 * - **Mouvement** : la SM tourne dès que le mouvement est autorisé (`!focus`). On ne gate plus sur
 *   `seen` (un logo figé 99 % du jour est inutile ; le marquage `seen` reste tenu pour un futur
 *   câblage optionnel des entrées 1×/jour, spec 18 §6.2, si l'art l'exige).
 * - **`prefers-reduced-motion`** : non gaté ici (l'idle du logo est une boucle douce).
 * - **Mode focus** : `autoplay=false` (mark discret, spec §4.5).
 * - **Échec d'asset** : `onLoadError` (native sur `useRive`) → repli immédiat vers le logo normal,
 *   complété d'un timeout de garde (6 s) si la runtime n'est pas prête (repli silencieux, spec
 *   §4.5) **sans** marquer `seen` (un deploy correctif plus tard dans la journée rejouera l'entrée).
 * - **Survol (desktop)** : tente de jouer `hoverState` (best-effort, dépend de l'artboard).
 * - **Clic (v2, §4.6)** : `clickState` (booléen true au press / false au relâché) ou `clickTrigger`
 *   (tiré au press). Rien de déclaré → clic inerte.
 * - **Suivi de souris (v2, §4.6)** : `trackMouse.pointerX/Y` (entrées nombre) nourries à chaque
 *   `pointermove`, dans le repère de l'artboard. Figé si `prefers-reduced-motion` ou en focus.
 * - **Thème runtime** : TODO — la surcharge des variables de couleur Rive selon `.dark` dépend des
 *   variables déclarées dans l'artboard. À brancher dès qu'un `.riv` avec variables `light`/`dark`
 *   sera livré (cf. spec §4.4 / §5.5). Non implémenté ici faute d'art à tester.
 *
 * Limites honnêtes : sans fichier `.riv` (404), ce composant signale `onError` et le parent affiche le
 * logo normal — le chemin Rive n'est visuellement exercé qu'une fois l'art déposé.
 *
 * Porté de l'ancien `components/molecules/m-doodle-renderer.tsx` (la persistance `seen` vient
 * désormais du store `doodle-seen.store` au lieu de l'ancien hook `useDoodleSeen`).
 */
const LOAD_TIMEOUT_MS = 6000;

/**
 * `StateMachineInputType.Boolean` dans la runtime Rive (= 59). Une entrée booléenne de la state
 * machine pilote typiquement le survol (ex. « IsTracking ») : la basculer déclenche l'animation
 * d'entrée/sortie du doodle. On compare au littéral pour éviter un import de valeur depuis
 * `@rive-app/canvas` (la ré-export des types suffit).
 */
const SM_INPUT_BOOLEAN = 59;
/** `StateMachineInputType.Number` (= 56) et `.Trigger` (= 58) dans la runtime Rive. */
const SM_INPUT_NUMBER = 56;
const SM_INPUT_TRIGGER = 58;

/** Entrées de la state machine résolues au `onRiveReady` (toutes optionnelles). */
interface DoodleInputs {
  hover: DoodleSMInput | null;
  clickBool: DoodleSMInput | null;
  clickTrigger: DoodleSMInput | null;
  pointerX: DoodleSMInput | null;
  pointerY: DoodleSMInput | null;
}

const NO_INPUTS: DoodleInputs = {
  hover: null,
  clickBool: null,
  clickTrigger: null,
  pointerX: null,
  pointerY: null,
};

/** `true` si l'utilisateur demande moins de mouvement. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Forme d'une entrée de state machine Rive (`StateMachineInput`), typée structurellement pour ne
 * pas importer `@rive-app/canvas` (dépendance indirecte). On n'utilise que `type`, `name` et la
 * valeur (`value`) — assez pour détecter l'entrée booléenne du survol et la basculer.
 */
type DoodleSMInput = {
  type: number;
  name: string;
  value: number | boolean;
  fire: () => void;
};

/**
 * Applique le thème (clair/sombre) au `.riv` chargé, en surchargeant les variables de couleur
 * déclarées dans l'artboard (spec §4.4 / §5.5 — l'argument décisif pour Rive : 1 `.riv` pour les
 * deux thèmes).
 *
 * TODO (art dépendant) : la surcharge runtime se fait via l'instance `rive` — parcourir
 * `rive.artboard` et redéfinir les couleurs selon les variables `light`/`dark` déclarées dans
 * l'éditeur rive.app. La API exacte dépend de **chaque artboard**, donc non implémentable tant
 * qu'aucun `.riv` avec variables de couleur n'est livré. En attendant : no-op (couleurs par défaut).
 */
function applyRiveTheme(rive: RiveState['rive'] | null, dark: boolean): void {
  if (!rive) return;
  if (process.env.NODE_ENV !== 'production') console.debug('[doodle] applyRiveTheme', dark);
  // → brancher la surcharge des couleurs de l'artboard ici (cf. TODO ci-dessus).
}

/** `true` si `<html>` porte la classe `.dark` (le thème est appliqué par les scripts init/layout). */
function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setDark(el.classList.contains('dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function DoodleRenderer({
  id,
  animate,
  label,
  focus = false,
  className,
  onError,
}: DoodleRendererProps) {
  const markSeen = useDoodleSeen((s) => s.markSeen);
  const dark = useIsDark();

  // Ratio largeur/hauteur de l'artboard (lu au `onRiveReady` via `rive.bounds`). Sert à donner au
  // conteneur une largeur concrète : la topbar fixe la hauteur (`h-9`/`h-10`), on en déduit la
  // largeur par le ratio pour que le `<canvas>` Rive reçoive une vraie boîte au lieu de `0×0`.
  // défaut `1` (carré) pour qu'une boîte non nulle existe dès le montage, avant que les bounds
  // soient disponibles ; corrigé au `onRiveReady`.
  const [aspect, setAspect] = useState(1);

  const motionAllowed = !focus;
  const autoplay = motionAllowed;

  const readyRef = useRef(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  // Entrées de la SM (auto-détectées au `onRiveReady`). Survol : beaucoup de doodles interactifs ont
  // un idle statique, l'animation ne se déclenche qu'en basculant une entrée booléenne (ex.
  // « IsTracking ») ; absente → repli sur `play(hoverState)`. Clic / suivi de souris : seulement si
  // l'occasion les déclare (« automatiquement opérationnel si le doodle le possède »).
  const inputsRef = useRef<DoodleInputs>(NO_INPUTS);
  // Dimensions de l'artboard (repère des entrées `trackMouse`).
  const artboardRef = useRef({ w: 0, h: 0 });

  const onRiveReady = (rive: RiveState['rive']) => {
    readyRef.current = true;
    // Succès : l'asset a chargé. On marque `seen` (entrée considérée comme jouée pour aujourd'hui).
    try {
      const b = rive?.bounds;
      if (b && typeof b.maxX === 'number' && typeof b.maxY === 'number') {
        const w = b.maxX - (b.minX ?? 0);
        const h = b.maxY - (b.minY ?? 0);
        if (w > 0 && h > 0) {
          setAspect(w / h);
          artboardRef.current = { w, h };
        }
      }
    } catch {
      /* bounds indisponibles — on garde le ratio par défaut (carré) */
    }
    // State machine interactive : on détecte la 1ʳᵉ SM (ou celle déclarée) et son entrée booléenne.
    try {
      const names = (rive?.stateMachineNames ?? []) as readonly string[];
      const smName = animate.stateMachine ?? names[0];
      if (smName && rive) {
        const inputs = (rive.stateMachineInputs(smName) ?? []) as DoodleSMInput[];
        const byName = (name: string | undefined, type: number) =>
          name ? (inputs.find((i) => i.name === name && i.type === type) ?? null) : null;
        // Survol : l'entrée nommée `hoverState`, sinon la 1ʳᵉ booléenne qui n'est pas celle du clic.
        const hover = animate.hoverState
          ? byName(animate.hoverState, SM_INPUT_BOOLEAN)
          : (inputs.find((i) => i.type === SM_INPUT_BOOLEAN && i.name !== animate.clickState) ?? null);
        inputsRef.current = {
          hover,
          clickBool: byName(animate.clickState, SM_INPUT_BOOLEAN),
          clickTrigger: byName(animate.clickTrigger, SM_INPUT_TRIGGER),
          pointerX: byName(animate.trackMouse?.pointerX, SM_INPUT_NUMBER),
          pointerY: byName(animate.trackMouse?.pointerY, SM_INPUT_NUMBER),
        };
      }
    } catch {
      inputsRef.current = NO_INPUTS;
    }
    markSeen(id);
  };

  const onLoadError = () => {
    onErrorRef.current?.();
  };

  const { RiveComponent, rive } = useRive({
    src: animate.file,
    stateMachines: animate.stateMachine,
    autoplay,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onRiveReady,
    onLoadError,
  });

  // Détection d'échec : si la runtime n'est pas prête dans le délai, repli.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!readyRef.current) onErrorRef.current?.();
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [animate.file]);

  // Thème runtime : (re)applique les couleurs du `.riv` selon `.dark` (stub documenté).
  useEffect(() => {
    applyRiveTheme(rive, dark);
  }, [rive, dark]);

  // Survol desktop : pilote le doodle. 1) SM interactive → bascule l'entrée booléenne détectée.
  // 2) Repli → joue l'animation nommée `hoverState`. Hors `motionAllowed` on ne déclenche rien.
  const onHover = () => {
    if (!motionAllowed) return;
    const input = inputsRef.current.hover;
    if (input) {
      try {
        input.value = true;
      } catch {
        /* entrée invalide — on ignore */
      }
      return;
    }
    if (!animate.hoverState || !rive) return;
    try {
      (rive as unknown as { play: (name: string) => void }).play(animate.hoverState);
    } catch {
      /* état inconnu — on ignore silencieusement */
    }
  };

  const onHoverEnd = () => {
    if (!motionAllowed) return;
    const input = inputsRef.current.hover;
    if (input) {
      try {
        input.value = false;
      } catch {
        /* entrée invalide — on ignore */
      }
    }
    release();
  };

  // Clic (v2) : press → booléen à true et/ou trigger tiré ; relâché → booléen à false.
  const onPointerDown = () => {
    if (!motionAllowed) return;
    const { clickBool, clickTrigger } = inputsRef.current;
    try {
      if (clickBool) clickBool.value = true;
      clickTrigger?.fire();
    } catch {
      /* entrée invalide — on ignore */
    }
  };

  const release = () => {
    const { clickBool } = inputsRef.current;
    if (!clickBool) return;
    try {
      clickBool.value = false;
    } catch {
      /* entrée invalide — on ignore */
    }
  };

  // Suivi de souris (v2) : position du pointeur ramenée dans le repère de l'artboard.
  const onPointerMove = (e: PointerEvent<HTMLSpanElement>) => {
    const { pointerX, pointerY } = inputsRef.current;
    if (!motionAllowed || (!pointerX && !pointerY) || e.pointerType !== 'mouse') return;
    if (prefersReducedMotion()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const { w, h } = artboardRef.current;
    const x = ((e.clientX - rect.left) / rect.width) * (w || rect.width);
    const y = ((e.clientY - rect.top) / rect.height) * (h || rect.height);
    try {
      if (pointerX) pointerX.value = x;
      if (pointerY) pointerY.value = y;
    } catch {
      /* entrée invalide — on ignore */
    }
  };

  return (
    <span
      role="img"
      aria-label={label}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerMove={onPointerMove}
      className={cn('inline-block', className)}
      style={{ aspectRatio: aspect }}
    >
      <RiveComponent style={{ display: 'block' }} />
    </span>
  );
}

export default DoodleRenderer;
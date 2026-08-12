import { render } from '@react-email/render';

/**
 * Rend un composant e-mail React en HTML — spec 32.
 *
 * `@react-email/render@2` expose `render` **async** (`Promise<string>`) — l'ancien
 * `renderAsync` n'existe plus (la fonction `render` elle-même est devenue asynchrone). On garde
 * `render` (prefer async au `render` sync historique pour ne pas bloquer le callback Better Auth
 * / la route handler). Aucune exécution client : React 19 / react-dom/server, runtime Node.
 *
 * Point d'extension unique : si on ajoute des templates plus tard, ils passent tous par ici.
 */
export async function renderEmail(component: React.ReactNode): Promise<string> {
  return render(component, { pretty: false });
}
import {Link, Row, Column, Img} from '@react-email/components';
import { env } from '@/env.mjs';

/**
 * CTA lien-texte orange des e-mails (spec 32 §5.3 / §2) — signature de marque `Label →`.
 *
 * Bouton plein en accent orange `#f76808` (DM Sans, weight 600), texte blanc. L'accent est
 * **identique dans les deux thèmes** (contraste suffisant sur fond clair comme sombre) : pas de
 * surcharge `dark:` sur le bouton.
 *
 * Sous le lien, URL brute en muted pour les clients sans HTML / lien masqué (compat) —
 * `text-muted` en clair / `.dm-muted` en sombre (surcharge `DARK_STYLE`).
 */
const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
// const FACEBOOK_ICON = `${base}/logo/facebook_icon.png`;
const TELEGRAM_ICON = `${base}/logo/telegram_icon.png`;
const TIKTOK_ICON = `${base}/logo/tiktok_icon.png`;

// Les liens externes passent par la passerelle `/api/r/:slug` (302) plutôt que directement vers
// `t.me` / `facebook.com` / … — pour aligner le domaine du lien sur le domaine d'envoi
// (`shemaproject.org`) et éviter le warning spam « link URLs match sending domain ». La map des
// destinations vit dans `app/api/r/[slug]/route.ts`. Facebook/TikTok n'ont pas encore de
// destination réelle → `#` en attendant.
const TELEGRAM_URL = `${base}/api/r/telegram`;

export function EmailSocialLink() {
  return (
    <tr>
      <td align="center">
        <Row className="table-cell h-[44px] w-[56px] align-bottom">
          {/*<Column className="pr-[9px]">*/}
          {/*  <Link href="#">*/}
          {/*    <Img*/}
          {/*      alt="Facebook"*/}
          {/*      height="21"*/}
          {/*      width="21"*/}
          {/*      src={FACEBOOK_ICON}*/}
          {/*    />*/}
          {/*  </Link>*/}
          {/*</Column>*/}

          <Column className="pr-[9px]">
            <Link href={TELEGRAM_URL}>
              <Img
                alt="Telegram"
                height="21"
                width="21"
                src={TELEGRAM_ICON}
              />
            </Link>
          </Column>

          <Column>
            <Link href="#">
              <Img
                alt="Tiktok"
                height="21"
                width="21"
                src={TIKTOK_ICON}
              />
            </Link>
          </Column>
        </Row>
      </td>
    </tr>
  );
}
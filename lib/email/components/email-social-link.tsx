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
const FACEBOOK_ICON = `${base}/logo/facebook_icon.png`;
const TELEGRAM_ICON = `${base}/logo/telegram_icon.png`;
const TIKTOK_ICON = `${base}/logo/tiktok_icon.png`;

export function EmailSocialLink() {
  return (
    <tr>
      <td align="center">
        <Row className="table-cell h-[44px] w-[56px] align-bottom">
          <Column className="pr-[9px]">
            <Link href="#">
              <Img
                alt="Facebook"
                height="19"
                width="19"
                src={FACEBOOK_ICON}
              />
            </Link>
          </Column>

          <Column className="pr-[9px]">
            <Link href="https://t.me/qZfwYAG7VSszMjgO">
              <Img
                alt="Telegram"
                height="20"
                width="20"
                src={TELEGRAM_ICON}
              />
            </Link>
          </Column>

          <Column>
            <Link href="#">
              <Img
                alt="Tiktok"
                height="19"
                width="19"
                src={TIKTOK_ICON}
              />
            </Link>
          </Column>
        </Row>
      </td>
    </tr>
  );
}
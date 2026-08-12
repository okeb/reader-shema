import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { InfoPage } from '@/src/presentation/components/templates/t-info-page';
import { ProseSection } from '@/src/presentation/components/atoms/a-prose-section';
import { APP_VERSION, BUG_EMAIL, type ChangelogEntry } from '@/src/shared/constants/legal';
import { getChangelog } from '@/src/shared/constants/changelog';

export const metadata: Metadata = {
  title: 'Nouveautés — ShemaProject',
  description: `Derniers changements du lecteur ShemaProject (v${APP_VERSION}).`,
};

type Props = { params: Promise<{ locale: string }> };

/** Convertit **gras** en <strong> et renvoie un tableau de noeuds React. */
function renderChangelogItem(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    return part;
  });
}

/** Un item « réel » : pas un placeholder italique du type *Rien pour le moment.* */
const PLACEHOLDER_RE = /^\*[^*]+\*$/;
function hasRealItems(entry: ChangelogEntry): boolean {
  return entry.sections.some((s) => s.items.some((i) => !PLACEHOLDER_RE.test(i.trim())));
}

export default async function NouveautesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const all = await getChangelog();
  // Masque la section [Unreleased] tant qu'elle n'a aucun changement réel.
  const entries = all.filter((e) => e.version !== 'Unreleased' || hasRealItems(e));

  return (
    <InfoPage title="Nouveautés">
      {entries.map((entry, i) => (
        <ProseSection
          key={entry.version}
          title={
            entry.version === 'Unreleased'
              ? 'Prochaine version'
              : `v${entry.version}${entry.date ? ` : ${entry.date}` : ''}`
          }
        >
          {entry.sections.map((section) => (
            <div key={section.title} className="mb-3">
              <p className="mb-1 text-[13px] font-semibold text-foreground/70">{section.title}</p>
              <ul className="space-y-1 text-foreground/80">
                {section.items.map((item, j) => (
                  <li key={j} className="text-[13px] leading-snug">
                    {renderChangelogItem(item)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {i === 0 && entry.version === APP_VERSION && (
            <p className="mt-3 text-[12px] text-muted-foreground">
              Vous êtes sur la dernière version.
            </p>
          )}
        </ProseSection>
      ))}

      <ProseSection title="Signaler un problème">
        <p>
          Vous avez repéré un bug ou une coquille ? Écrivez-nous à{' '}
          <a href={`mailto:${BUG_EMAIL}`} className="underline underline-offset-4 hover:text-primary">
            {BUG_EMAIL}
          </a>
          .
        </p>
      </ProseSection>
    </InfoPage>
  );
}
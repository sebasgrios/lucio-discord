import type { Locale, UiCopy } from './copy';

export function LegalPage({
  type,
  copy,
  locale,
  onToggleLocale,
}: {
  type: 'privacy' | 'terms';
  copy: UiCopy;
  locale: Locale;
  onToggleLocale: () => void;
}) {
  const title = type === 'privacy' ? copy.legalPrivacyTitle : copy.legalTermsTitle;
  const paragraphs = type === 'privacy' ? copy.legalPrivacyBody : copy.legalTermsBody;
  return (
    <div className="legal-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Lucio">
          <img className="brand-mark" src="/assets/lucio-icon.jpg" alt="" />
          <span>Lucio</span>
        </a>
        <div className="header-actions">
          <button
            className="language-toggle"
            onClick={onToggleLocale}
            lang={locale === 'es' ? 'en' : 'es'}
          >
            {copy.languageName}
          </button>
          <a className="button ghost compact" href="/">
            {copy.backHome}
          </a>
        </div>
      </header>
      <main className="legal-content">
        <p className="eyebrow">LUCIO</p>
        <h1>{title}</h1>
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p className="legal-date">
          {locale === 'es'
            ? 'Última actualización: 14 de septiembre de 2026.'
            : 'Last updated: September 14, 2026.'}
        </p>
      </main>
    </div>
  );
}

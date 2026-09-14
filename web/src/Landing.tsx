import type { CurrentUser } from './api';
import type { Locale, UiCopy } from './copy';
import { Icon } from './Icons';

interface LandingProps {
  copy: UiCopy;
  locale: Locale;
  user: CurrentUser | null;
  onToggleLocale: () => void;
}

export function Landing({ copy, locale, user, onToggleLocale }: LandingProps) {
  const dashboardHref = user ? '/dashboard' : '/auth/discord';
  return (
    <div className="landing">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Lucio">
          <img className="brand-mark" src="/assets/lucio-icon.jpg" alt="" />
          <span>Lucio</span>
        </a>
        <nav className="landing-nav" aria-label="Principal">
          <a href="#ventajas">{copy.landingNavFeatures}</a>
          <a href="#como-funciona">{copy.landingNavHow}</a>
          <a href="#fuentes">{copy.landingNavSources}</a>
        </nav>
        <div className="header-actions">
          <button
            className="language-toggle"
            onClick={onToggleLocale}
            lang={locale === 'es' ? 'en' : 'es'}
          >
            {copy.languageName}
          </button>
          <a className="button ghost compact" href={dashboardHref}>
            {user ? copy.landingDashboard : copy.landingLogin}
          </a>
          <a className="button primary compact header-invite" href="/invite">
            <Icon name="discord" /> {copy.addBot}
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{copy.heroEyebrow}</p>
            <h1>{copy.heroTitle}</h1>
            <p className="hero-body">{copy.heroBody}</p>
            <div className="hero-actions">
              <a className="button primary" href="/invite">
                <Icon name="discord" />
                {copy.heroPrimary}
              </a>
              <a className="button ghost" href="#como-funciona">
                {copy.heroSecondary}
                <Icon name="arrow" />
              </a>
            </div>
            <p className="hero-note">
              <span />
              <span>{copy.heroNote}</span>
            </p>
          </div>
          <PlayerPreview copy={copy} />
        </section>

        <section className="section promise" id="ventajas">
          <div className="section-intro centered">
            <p className="eyebrow">{copy.promiseEyebrow}</p>
            <h2>{copy.promiseTitle}</h2>
            <p>{copy.promiseBody}</p>
          </div>
          <div className="feature-grid">
            <Feature icon="lightning" title={copy.featureFastTitle} body={copy.featureFastBody} />
            <Feature
              icon="headphones"
              title={copy.featureQualityTitle}
              body={copy.featureQualityBody}
            />
            <Feature
              icon="sparkles"
              title={copy.featureSharedTitle}
              body={copy.featureSharedBody}
            />
            <Feature icon="server" title={copy.featureLightTitle} body={copy.featureLightBody} />
          </div>
        </section>

        <section className="section how-section" id="como-funciona">
          <div className="section-intro">
            <p className="eyebrow">{copy.howEyebrow}</p>
            <h2>{copy.howTitle}</h2>
          </div>
          <ol className="steps">
            {copy.howSteps.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="section sources-section" id="fuentes">
          <div className="section-intro centered">
            <p className="eyebrow">{copy.sourcesEyebrow}</p>
            <h2>{copy.sourcesTitle}</h2>
          </div>
          <div className="source-grid">
            <article className="source-card youtube-source">
              <div className="source-icon">
                <Icon name="youtube" />
              </div>
              <div>
                <h3>{copy.youtubeTitle}</h3>
                <p>{copy.youtubeBody}</p>
              </div>
              <span className="status-pill">
                {locale === 'es' ? 'Sin configuración' : 'No setup'}
              </span>
            </article>
            <article className="source-card spotify-source-card">
              <div className="source-icon spotify-glyph">●</div>
              <div>
                <h3>{copy.spotifyTitle}</h3>
                <p>{copy.spotifyBody}</p>
              </div>
              <span className="status-pill">OAuth</span>
            </article>
          </div>
        </section>

        <section className="section safety-section">
          <div className="safety-copy">
            <p className="eyebrow">{copy.safetyEyebrow}</p>
            <h2>{copy.safetyTitle}</h2>
            <p>{copy.safetyBody}</p>
          </div>
          <div className="safety-list">
            {[copy.safetyTokens, copy.safetyPermissions, copy.safetyTracking].map((item) => (
              <div key={item}>
                <span>
                  <Icon name="check" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="section faq-section">
          <div className="section-intro centered">
            <p className="eyebrow">{copy.faqEyebrow}</p>
            <h2>{copy.faqTitle}</h2>
          </div>
          <div className="faq-list">
            {copy.faqs.map((faq, index) => (
              <details key={faq.question} open={index === 0}>
                <summary>
                  {faq.question}
                  <span>+</span>
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta">
          <img src="/assets/lucio-icon.jpg" alt="" />
          <p className="eyebrow">LUCIO</p>
          <h2>{copy.finalTitle}</h2>
          <p>{copy.finalBody}</p>
          <div className="hero-actions">
            <a className="button primary" href="/invite">
              <Icon name="discord" />
              {copy.addBot}
            </a>
            <a className="button ghost" href={dashboardHref}>
              {copy.dashboard}
              <Icon name="arrow" />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="/">
          <img className="brand-mark" src="/assets/lucio-icon.jpg" alt="" />
          <span>Lucio</span>
        </a>
        <p>{copy.footerTagline}</p>
        <nav>
          <a href="/privacy">{copy.privacy}</a>
          <a href="/terms">{copy.terms}</a>
        </nav>
      </footer>
    </div>
  );
}

function PlayerPreview({ copy }: { copy: UiCopy }) {
  return (
    <div className="hero-visual" aria-label={copy.controls}>
      <div className="visual-glow" />
      <div className="preview-window">
        <div className="preview-top">
          <span />
          <span />
          <span />
          <small>lucio.app</small>
        </div>
        <div className="preview-player">
          <div className="preview-art">
            <img src="/assets/lucio-icon.jpg" alt="" />
          </div>
          <p className="eyebrow">{copy.previewLive}</p>
          <h2>{copy.previewTrack}</h2>
          <p>{copy.previewArtist}</p>
          <div className="preview-progress">
            <span />
          </div>
          <div className="preview-times">
            <span>1:12</span>
            <span>3:48</span>
          </div>
          <div className="preview-controls">
            <Icon name="shuffle" />
            <button>
              <Icon name="pause" />
            </button>
            <Icon name="skip" />
            <Icon name="repeat" />
          </div>
        </div>
        <div className="preview-footer">
          <span>{copy.previewQueue}</span>
          <span>{copy.previewListeners}</span>
        </div>
      </div>
      <div className="floating-card floating-queue">
        <span className="equalizer">
          <i />
          <i />
          <i />
        </span>
        <div>
          <strong>{copy.previewTrack}</strong>
          <small>{copy.previewArtist}</small>
        </div>
      </div>
      <div className="floating-card floating-ready">
        <span>
          <Icon name="check" />
        </span>
        {localeReady(copy)}
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: 'lightning' | 'headphones' | 'sparkles' | 'server';
  title: string;
  body: string;
}) {
  return (
    <article className="feature-card">
      <span>
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function localeReady(copy: UiCopy): string {
  return copy.ready.includes('LISTO') ? 'Listo para sonar' : 'Ready to play';
}

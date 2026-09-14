import { useCallback, useEffect, useState } from 'react';
import { ApiError, api, type CurrentUser } from './api';
import { UI_COPY, type Locale } from './copy';
import { Dashboard } from './Dashboard';
import { Landing } from './Landing';
import { LegalPage } from './LegalPage';
import { OnboardingModal } from './Onboarding';
import { TutorialCapture } from './TutorialCapture';

const localeKey = 'lucio-locale';

function initialLocale(): Locale {
  const saved = localStorage.getItem(localeKey);
  if (saved === 'es' || saved === 'en') return saved;
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const copy = UI_COPY[locale];
  const path = location.pathname;
  const capture = new URLSearchParams(location.search).get('tutorial-capture');
  const isCapture =
    Boolean(capture) && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem(localeKey, locale);
  }, [locale]);

  useEffect(() => {
    if (isCapture || (path !== '/' && path !== '/dashboard')) {
      return;
    }
    void api
      .me()
      .then((currentUser) => {
        setUser(currentUser);
        if (path === '/dashboard' && !currentUser.onboardingCompleted) setShowTutorial(true);
      })
      .catch((error: unknown) => {
        if (!(error instanceof ApiError && error.code === 'NOT_AUTHORIZED')) {
          console.error('Unable to load the current session.');
        }
      })
      .finally(() => setLoadingUser(false));
  }, [isCapture, path]);

  const toggleLocale = useCallback(
    () => setLocale((current) => (current === 'es' ? 'en' : 'es')),
    [],
  );

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    if (user && !user.onboardingCompleted) {
      setUser({ ...user, onboardingCompleted: true });
      void api.completeOnboarding().catch(() => {
        setUser((current) => (current ? { ...current, onboardingCompleted: false } : current));
      });
    }
  }, [user]);

  if (capture && isCapture) {
    return <TutorialCapture step={Number(capture)} />;
  }

  if (path === '/privacy' || path === '/terms') {
    return (
      <LegalPage
        type={path === '/privacy' ? 'privacy' : 'terms'}
        copy={copy}
        locale={locale}
        onToggleLocale={toggleLocale}
      />
    );
  }

  if (path === '/dashboard') {
    if (loadingUser) return <Loading label={copy.loading} />;
    if (!user) {
      return (
        <main className="login-page">
          <section className="login-card">
            <img src="/assets/lucio-icon.jpg" alt="Lucio" />
            <p className="eyebrow">LUCIO</p>
            <h1>{copy.loginRequiredTitle}</h1>
            <p>{copy.loginRequiredBody}</p>
            <a className="button primary" href="/auth/discord">
              {copy.landingLogin}
            </a>
            <small>{copy.loginPrivacy}</small>
          </section>
        </main>
      );
    }
    return (
      <>
        <Dashboard
          user={user}
          copy={copy}
          locale={locale}
          onToggleLocale={toggleLocale}
          onShowTutorial={() => setShowTutorial(true)}
        />
        {showTutorial && <OnboardingModal copy={copy} onClose={closeTutorial} />}
      </>
    );
  }

  return <Landing copy={copy} locale={locale} user={user} onToggleLocale={toggleLocale} />;
}

function Loading({ label }: { label: string }) {
  return (
    <main className="loading-page" aria-label={label}>
      <img src="/assets/lucio-icon.jpg" alt="" />
      <span />
    </main>
  );
}

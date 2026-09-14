import type { ReactNode } from 'react';
import { Icon } from './Icons';

export function TutorialCapture({ step }: { step: number }) {
  const safeStep = Math.min(5, Math.max(1, Number.isFinite(step) ? step : 1));
  return (
    <main className="capture-page">
      <header className="capture-header">
        <div className="brand">
          <img className="brand-mark" src="/assets/lucio-icon.jpg" alt="" />
          <span>Lucio</span>
        </div>
        <span>Guía rápida · {safeStep}/5</span>
      </header>
      {safeStep === 1 && <ServersScene />}
      {safeStep === 2 && <VoiceScene />}
      {safeStep === 3 && <SetupScene />}
      {safeStep === 4 && <PlayerScene />}
      {safeStep === 5 && <SharedScene />}
    </main>
  );
}

function ServersScene() {
  return (
    <section className="capture-content">
      <p className="eyebrow">TUS SERVIDORES</p>
      <h1>¿Dónde ponemos música?</h1>
      <div className="capture-server-grid">
        <CaptureServer initial="N" name="Noches de código" installed />
        <CaptureServer initial="A" name="Amigos & música" />
        <CaptureServer initial="G" name="Gaming lounge" installed />
      </div>
    </section>
  );
}

function CaptureServer({
  initial,
  name,
  installed = false,
}: {
  initial: string;
  name: string;
  installed?: boolean;
}) {
  return (
    <article className={`capture-server ${installed ? 'installed' : ''}`}>
      <div>
        <span className="capture-avatar">{initial}</span>
        <small>
          <i />
          {installed ? 'Lucio instalado' : 'Pendiente de instalar'}
        </small>
      </div>
      <h2>{name}</h2>
      <button>
        <Icon name={installed ? 'play' : 'discord'} />
        {installed ? 'Abrir reproductor' : 'Añadir aquí'}
      </button>
    </article>
  );
}

function DiscordShell({ children }: { children: ReactNode }) {
  return (
    <section className="discord-window">
      <aside>
        <strong>NOCHES DE CÓDIGO</strong>
        <p># general</p>
        <p># música</p>
        <h4>CANALES DE VOZ</h4>
        <p className="selected">🔊 Sala principal</p>
      </aside>
      <div className="discord-content">
        <header># música</header>
        {children}
      </div>
    </section>
  );
}

function VoiceScene() {
  return (
    <DiscordShell>
      <div className="voice-scene">
        <p className="eyebrow">SALA PRINCIPAL</p>
        <h1>Entra en voz y Lucio te seguirá.</h1>
        <div className="voice-members">
          <Member letter="A" name="Alex" />
          <Member letter="M" name="Marta" />
          <Member letter="L" name="Lucio" bot />
        </div>
      </div>
    </DiscordShell>
  );
}

function Member({ letter, name, bot = false }: { letter: string; name: string; bot?: boolean }) {
  return (
    <div>
      <span>{letter}</span>
      <strong>
        {name}
        {bot && <small> BOT</small>}
      </strong>
      <i />
    </div>
  );
}

function SetupScene() {
  return (
    <DiscordShell>
      <div className="discord-chat">
        <div className="slash-command">
          <span>S</span>
          <div>
            <strong>Alex</strong>
            <p>
              <b>/setup</b>
            </p>
          </div>
        </div>
        <div className="bot-message">
          <img src="/assets/lucio-icon.jpg" alt="" />
          <div>
            <strong>
              Lucio <small>APP</small>
            </strong>
            <article>
              <h3>Configura Spotify para este servidor</h3>
              <p>
                Vincula una cuenta para importar pistas, álbumes y playlists. Si no, la música
                continuará reproduciéndose desde YouTube.
              </p>
              <button>Vincular Spotify</button>
            </article>
          </div>
        </div>
      </div>
    </DiscordShell>
  );
}

function PlayerScene() {
  return (
    <section className="capture-player">
      <div className="capture-cover">
        <img src="/assets/lucio-icon.jpg" alt="" />
      </div>
      <div>
        <p className="eyebrow">LUCIO ESTÁ LISTO</p>
        <h1>La primera canción empieza aquí.</h1>
        <p>Busca por título o pega un enlace de YouTube o Spotify.</p>
        <div className="capture-search">
          <span>Midnight City — M83</span>
          <button>Añadir</button>
        </div>
      </div>
    </section>
  );
}

function SharedScene() {
  return (
    <section className="shared-scene">
      <div className="mini-discord">
        <h3># música</h3>
        <div>
          <img src="/assets/lucio-icon.jpg" alt="" />
          <p>
            <strong>Lucio</strong>
            <br />
            Ahora suena · Midnight City
          </p>
        </div>
        <article>
          <Icon name="pause" />
          <Icon name="skip" />
          <Icon name="repeat" />
        </article>
      </div>
      <div className="sync-mark">
        <Icon name="lightning" />
      </div>
      <div className="mini-dashboard">
        <p className="eyebrow">REPRODUCIENDO</p>
        <h2>Midnight City</h2>
        <p>M83</p>
        <div className="preview-progress">
          <span />
        </div>
        <article>
          <Icon name="pause" />
          <Icon name="skip" />
          <Icon name="repeat" />
        </article>
        <h4>A CONTINUACIÓN</h4>
        <p>Wait · M83</p>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  GuildSettings,
  LoopMode,
  PlayerAction,
  SessionSnapshot,
} from '../../src/shared/types';
import { calculatePlaybackPosition } from '../../src/shared/progress';
import {
  ApiError,
  api,
  type CurrentUser,
  type GuildOptions,
  type GuildSummary,
  type SpotifyStatus,
} from './api';
import type { Locale, UiCopy } from './copy';
import { Icon } from './Icons';

type DashboardView = 'servers' | 'player' | 'settings';

export function Dashboard({
  user,
  copy,
  locale,
  onToggleLocale,
  onShowTutorial,
}: {
  user: CurrentUser;
  copy: UiCopy;
  locale: Locale;
  onToggleLocale: () => void;
  onShowTutorial: () => void;
}) {
  const initial = readDashboardLocation(user.guilds);
  const [guildId, setGuildId] = useState(initial.guildId);
  const [view, setView] = useState<DashboardView>(initial.view);
  const guild = user.guilds.find((item) => item.id === guildId) ?? null;

  const navigate = useCallback((nextGuildId: string, nextView: DashboardView) => {
    setGuildId(nextGuildId);
    setView(nextView);
    const parameters = new URLSearchParams();
    if (nextGuildId) parameters.set('guild', nextGuildId);
    if (nextView !== 'servers') parameters.set('view', nextView);
    history.pushState(null, '', `/dashboard${parameters.size ? `?${parameters}` : ''}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const next = readDashboardLocation(user.guilds);
      setGuildId(next.guildId);
      setView(next.view);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [user.guilds]);

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <a className="brand" href="/" aria-label="Lucio">
          <img className="brand-mark" src="/assets/lucio-icon.jpg" alt="" />
          <span>Lucio</span>
        </a>
        <span className="dashboard-label">{copy.dashboard}</span>
        <div className="header-actions">
          <button className="button ghost compact help-button" onClick={onShowTutorial}>
            {copy.howItWorks}
          </button>
          <button
            className="language-toggle"
            onClick={onToggleLocale}
            lang={locale === 'es' ? 'en' : 'es'}
          >
            {copy.languageName}
          </button>
          <a className="button primary compact" href="/invite">
            <Icon name="discord" />
            {copy.addBot}
          </a>
          <div className="profile-menu">
            {user.avatar ? (
              <img
                src={`https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png?size=64`}
                alt=""
              />
            ) : (
              <span>{user.displayName.slice(0, 1).toUpperCase()}</span>
            )}
            <div>
              <strong>{user.displayName}</strong>
              <button onClick={() => void api.logout().then(() => location.assign('/'))}>
                {copy.logout}
              </button>
            </div>
          </div>
        </div>
      </header>

      {view === 'servers' || !guild ? (
        <ServerOverview user={user} copy={copy} onNavigate={navigate} />
      ) : (
        <ServerWorkspace guild={guild} view={view} copy={copy} onNavigate={navigate} />
      )}
    </div>
  );
}

function ServerOverview({
  user,
  copy,
  onNavigate,
}: {
  user: CurrentUser;
  copy: UiCopy;
  onNavigate: (guildId: string, view: DashboardView) => void;
}) {
  return (
    <main className="dashboard-main">
      <div className="dashboard-intro">
        <p className="eyebrow">{copy.dashboardEyebrow}</p>
        <h1>{copy.dashboardTitle}</h1>
        <p>{copy.dashboardBody}</p>
      </div>
      {user.guilds.length ? (
        <div className="server-grid">
          {user.guilds.map((guild) => (
            <article
              className={`server-card ${guild.botInstalled ? 'is-installed' : ''}`}
              key={guild.id}
            >
              <div className="server-card-top">
                <GuildIcon guild={guild} />
                <span className={`server-status ${guild.botInstalled ? 'online' : ''}`}>
                  <i /> {guild.botInstalled ? copy.installed : copy.notInstalled}
                </span>
              </div>
              <h2>{guild.name}</h2>
              {guild.botInstalled ? (
                <div className="server-actions">
                  <button className="button primary" onClick={() => onNavigate(guild.id, 'player')}>
                    <Icon name="play" />
                    {copy.openPlayer}
                  </button>
                  <button
                    className="button ghost icon-button"
                    onClick={() => onNavigate(guild.id, 'settings')}
                    aria-label={`${copy.openSettings}: ${guild.name}`}
                  >
                    <Icon name="settings" />
                  </button>
                </div>
              ) : (
                <a
                  className="button ghost full"
                  href={`/invite?guild_id=${encodeURIComponent(guild.id)}`}
                >
                  <Icon name="discord" />
                  {copy.installHere}
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name="server" />
          <h2>{copy.noServersTitle}</h2>
          <p>{copy.noServersBody}</p>
          <a className="button primary" href="/invite">
            {copy.addBot}
          </a>
        </div>
      )}
    </main>
  );
}

function ServerWorkspace({
  guild,
  view,
  copy,
  onNavigate,
}: {
  guild: GuildSummary;
  view: Exclude<DashboardView, 'servers'>;
  copy: UiCopy;
  onNavigate: (guildId: string, view: DashboardView) => void;
}) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [settings, setSettings] = useState<GuildSettings | null>(null);
  const [options, setOptions] = useState<GuildOptions>({ channels: [], roles: [] });
  const [spotify, setSpotify] = useState<SpotifyStatus | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshSpotify = useCallback(() => {
    void api
      .spotify(guild.id)
      .then(setSpotify)
      .catch(() => setSpotify(null));
  }, [guild.id]);

  useEffect(() => {
    void api
      .player(guild.id)
      .then((result) => setSnapshot(result.snapshot))
      .catch(showError(setNotice));
    void api.settings(guild.id).then(setSettings).catch(showError(setNotice));
    void api
      .options(guild.id)
      .then(setOptions)
      .catch(() => setOptions({ channels: [], roles: [] }));
    refreshSpotify();
    window.addEventListener('focus', refreshSpotify);

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${location.host}/ws`);
    socket.addEventListener('open', () =>
      socket.send(JSON.stringify({ type: 'subscribe', guildId: guild.id })),
    );
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as {
        type: string;
        data: SessionSnapshot | null;
      };
      if (message.type === 'snapshot') setSnapshot(message.data);
    });
    return () => {
      window.removeEventListener('focus', refreshSpotify);
      socket.close();
    };
  }, [guild.id, refreshSpotify]);

  const apply = useCallback(
    async (action: PlayerAction) => {
      setBusy(true);
      try {
        const result = await api.action(guild.id, action);
        setSnapshot(result.snapshot);
        setNotice(copy.controlApplied);
      } catch (error) {
        showError(setNotice)(error);
      } finally {
        setBusy(false);
      }
    },
    [copy.controlApplied, guild.id],
  );

  return (
    <main className="workspace-main">
      <button className="back-button" onClick={() => onNavigate('', 'servers')}>
        ← {copy.backToServers}
      </button>
      <div className="workspace-title">
        <GuildIcon guild={guild} />
        <div>
          <p className="eyebrow">{guild.botInstalled ? copy.installed : copy.notInstalled}</p>
          <h1>{guild.name}</h1>
        </div>
        <div className="workspace-tabs">
          <button
            className={view === 'player' ? 'active' : ''}
            onClick={() => onNavigate(guild.id, 'player')}
          >
            <Icon name="play" />
            {copy.player}
          </button>
          <button
            className={view === 'settings' ? 'active' : ''}
            onClick={() => onNavigate(guild.id, 'settings')}
          >
            <Icon name="settings" />
            {copy.settings}
          </button>
        </div>
      </div>

      {view === 'player' ? (
        <PlayerPanel
          guildId={guild.id}
          snapshot={snapshot}
          copy={copy}
          busy={busy}
          notice={notice}
          setNotice={setNotice}
          apply={apply}
        />
      ) : settings ? (
        <SettingsPanel
          guildName={guild.name}
          settings={settings}
          options={options}
          spotify={spotify}
          copy={copy}
          onSave={async (patch) => {
            const next = await api.updateSettings(guild.id, patch);
            setSettings(next);
            setNotice(copy.settingsSaved);
          }}
          onDisconnectSpotify={async () => {
            await api.disconnectSpotify(guild.id);
            refreshSpotify();
            setNotice(copy.spotifyDisconnected);
          }}
        />
      ) : (
        <div className="panel-loading">
          <span />
        </div>
      )}
      {view === 'settings' && notice && (
        <p className="workspace-notice" role="status">
          {notice}
        </p>
      )}
    </main>
  );
}

function PlayerPanel({
  guildId,
  snapshot,
  copy,
  busy,
  notice,
  setNotice,
  apply,
}: {
  guildId: string;
  snapshot: SessionSnapshot | null;
  copy: UiCopy;
  busy: boolean;
  notice: string;
  setNotice: (message: string) => void;
  apply: (action: PlayerAction) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  async function play(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    try {
      const result = await api.play(guildId, query.trim());
      setQuery('');
      setNotice(
        result.resolving > 0 ? copy.resolvingRemaining(result.resolving) : copy.added(result.added),
      );
    } catch (error) {
      showError(setNotice)(error);
    }
  }
  return (
    <div className="player-layout">
      <section className="player-card">
        <div className="artwork">
          <img
            src={snapshot?.state.current?.thumbnailUrl ?? '/assets/lucio-icon.jpg'}
            className={snapshot?.state.current?.thumbnailUrl ? '' : 'placeholder-artwork'}
            alt=""
          />
        </div>
        <div className="track-copy">
          <p className="eyebrow">
            {snapshot?.state.status === 'playing' ? copy.playing : copy.ready}
          </p>
          <h2>{snapshot?.state.current?.title ?? copy.channelWaiting}</h2>
          <p>{snapshot?.state.current?.artist ?? copy.addToStart}</p>
        </div>
        <Progress snapshot={snapshot} />
        <div className="controls" aria-label={copy.controls}>
          <button
            disabled={busy || !snapshot}
            onClick={() => void apply({ type: 'shuffle' })}
            aria-label={copy.shuffle}
          >
            <Icon name="shuffle" />
          </button>
          <button
            className="primary-control"
            disabled={busy || !snapshot}
            onClick={() =>
              void apply({ type: snapshot?.state.status === 'paused' ? 'resume' : 'pause' })
            }
            aria-label={snapshot?.state.status === 'paused' ? copy.resume : copy.pause}
          >
            <Icon name={snapshot?.state.status === 'paused' ? 'play' : 'pause'} />
          </button>
          <button
            disabled={busy || !snapshot}
            onClick={() => void apply({ type: 'skip' })}
            aria-label={copy.skip}
          >
            <Icon name="skip" />
          </button>
          <button
            disabled={busy || !snapshot}
            onClick={() =>
              void apply({ type: 'loop', mode: nextLoop(snapshot?.state.loopMode ?? 'off') })
            }
            aria-label={copy.loop}
          >
            <Icon name="repeat" />
          </button>
          <button
            disabled={busy || !snapshot}
            onClick={() => void apply({ type: 'stop' })}
            aria-label={copy.stop}
          >
            <Icon name="stop" />
          </button>
        </div>
        <form className="search" onSubmit={(event) => void play(event)}>
          <label htmlFor="query">{copy.searchLabel}</label>
          <div>
            <input
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              maxLength={500}
            />
            <button disabled={busy || !query.trim()}>{copy.add}</button>
          </div>
        </form>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
      </section>
      <aside className="queue-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.upNext}</p>
            <h2>{copy.queue}</h2>
          </div>
          <span>{snapshot?.queue.length ?? 0}</span>
        </div>
        <div className="queue-list">
          {snapshot?.queue.length ? (
            snapshot.queue.map((track, index) => (
              <div className="queue-item" key={track.id}>
                <span className="queue-index">{index + 1}</span>
                <div>
                  <strong>{track.title}</strong>
                  <small>{track.artist}</small>
                </div>
                <div className="queue-actions">
                  <button
                    disabled={index === 0}
                    onClick={() => void apply({ type: 'move', from: index + 1, to: index })}
                    aria-label={`${copy.moveUp} ${track.title}`}
                  >
                    ↑
                  </button>
                  <button
                    disabled={index === snapshot.queue.length - 1}
                    onClick={() => void apply({ type: 'move', from: index + 1, to: index + 2 })}
                    aria-label={`${copy.moveDown} ${track.title}`}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => void apply({ type: 'remove', position: index + 1 })}
                    aria-label={`${copy.remove} ${track.title}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="empty">{copy.emptyQueue}</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Progress({ snapshot }: { snapshot: SessionSnapshot | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);
  const position = useMemo(() => calculatePlaybackPosition(snapshot, now), [snapshot, now]);
  const duration = snapshot?.state.current?.durationMs ?? 0;
  const percent = duration ? Math.min(100, (position / duration) * 100) : 0;
  return (
    <div className="progress" data-state={snapshot?.state.status ?? 'idle'}>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Progreso de reproducción"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.round(position)}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <div>
        <span>{time(position)}</span>
        <span>{time(duration)}</span>
      </div>
    </div>
  );
}

function SettingsPanel({
  guildName,
  settings,
  options,
  spotify,
  copy,
  onSave,
  onDisconnectSpotify,
}: {
  guildName: string;
  settings: GuildSettings;
  options: GuildOptions;
  spotify: SpotifyStatus | null;
  copy: UiCopy;
  onSave: (patch: Partial<GuildSettings>) => Promise<void>;
  onDisconnectSpotify: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);
  return (
    <section className="settings-card wide-settings">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{copy.administration}</p>
          <h2>{guildName}</h2>
        </div>
      </div>
      <div className="settings-grid">
        <label>
          {copy.language}
          <select
            value={draft.locale}
            onChange={(event) => setDraft({ ...draft, locale: event.target.value as 'es' | 'en' })}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          {copy.commandChannel}
          <select
            value={draft.commandChannelId ?? ''}
            onChange={(event) =>
              setDraft({ ...draft, commandChannelId: event.target.value || null })
            }
          >
            <option value="">{copy.anyChannel}</option>
            {options.channels.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.djRole}
          <select
            value={draft.djRoleId ?? ''}
            onChange={(event) => setDraft({ ...draft, djRoleId: event.target.value || null })}
          >
            <option value="">{copy.noDjRole}</option>
            {options.roles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {spotify && (
        <div className="spotify-setup">
          <div>
            <strong>Spotify</strong>
            <small>
              {!spotify.available
                ? copy.spotifyUnavailable
                : spotify.connected
                  ? copy.spotifyConnected
                  : copy.spotifyNotConnected}
            </small>
          </div>
          {spotify.available && spotify.authorizationUrl && (
            <a
              className="spotify-button"
              href={spotify.authorizationUrl}
              target="_blank"
              rel="noreferrer"
            >
              {spotify.connected ? copy.spotifyReconnect : copy.spotifyConnect}
            </a>
          )}
          {spotify.connected && (
            <button className="danger-button" onClick={() => void onDisconnectSpotify()}>
              {copy.spotifyDisconnect}
            </button>
          )}
        </div>
      )}
      <button
        className="button primary save-button"
        onClick={() =>
          void onSave({
            locale: draft.locale,
            commandChannelId: draft.commandChannelId,
            djRoleId: draft.djRoleId,
          })
        }
      >
        {copy.saveSettings}
      </button>
    </section>
  );
}

function GuildIcon({ guild }: { guild: GuildSummary }) {
  return guild.icon ? (
    <img
      className="guild-icon"
      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
      alt=""
    />
  ) : (
    <span className="guild-icon guild-initial">{guild.name.slice(0, 1).toUpperCase()}</span>
  );
}

function readDashboardLocation(guilds: GuildSummary[]): { guildId: string; view: DashboardView } {
  const parameters = new URLSearchParams(location.search);
  const guildId = parameters.get('guild') ?? '';
  const requestedView = parameters.get('view');
  const guild = guilds.find((item) => item.id === guildId && item.botInstalled);
  return guild && (requestedView === 'player' || requestedView === 'settings')
    ? { guildId, view: requestedView }
    : { guildId: '', view: 'servers' };
}

function showError(setter: (message: string) => void) {
  return (error: unknown) =>
    setter(
      error instanceof ApiError || error instanceof Error ? error.message : 'Ha ocurrido un error.',
    );
}
function nextLoop(mode: LoopMode): LoopMode {
  return mode === 'off' ? 'track' : mode === 'track' ? 'queue' : 'off';
}
function time(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

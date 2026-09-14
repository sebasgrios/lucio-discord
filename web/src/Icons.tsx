export type IconName =
  | 'arrow'
  | 'check'
  | 'discord'
  | 'headphones'
  | 'lightning'
  | 'lock'
  | 'pause'
  | 'play'
  | 'repeat'
  | 'server'
  | 'settings'
  | 'shuffle'
  | 'skip'
  | 'sparkles'
  | 'stop'
  | 'youtube';

export function Icon({ name }: { name: IconName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}>
      {name === 'arrow' && <path d="m9 18 6-6-6-6" />}
      {name === 'check' && <path d="m5 12 4 4L19 6" />}
      {name === 'discord' && (
        <path d="M8.5 8.5a8 8 0 0 1 7 0M7 17c3.5 1.7 6.5 1.7 10 0l2-8.5A13 13 0 0 0 15.5 7l-.7 1.2a10 10 0 0 0-5.6 0L8.5 7A13 13 0 0 0 5 8.5L7 17ZM9.3 13h.01M14.7 13h.01" />
      )}
      {name === 'headphones' && (
        <path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5Z" />
      )}
      {name === 'lightning' && <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />}
      {name === 'lock' && (
        <>
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      )}
      {name === 'play' && <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />}
      {name === 'pause' && (
        <>
          <path d="M9 5v14" />
          <path d="M15 5v14" />
        </>
      )}
      {name === 'repeat' && (
        <>
          <path d="m17 2 4 4-4 4" />
          <path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />
        </>
      )}
      {name === 'server' && (
        <>
          <rect x="3" y="4" width="18" height="6" rx="2" />
          <rect x="3" y="14" width="18" height="6" rx="2" />
          <path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" />
        </>
      )}
      {name === 'settings' && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </>
      )}
      {name === 'shuffle' && (
        <>
          <path d="M3 6h2.5c5.5 0 7 12 12.5 12H21" />
          <path d="m18 15 3 3-3 3M3 18h2.5c2.2 0 3.8-1.9 5.2-4.2M14.2 7.7C15.3 6.7 16.5 6 18 6h3m-3-3 3 3-3 3" />
        </>
      )}
      {name === 'skip' && (
        <>
          <path d="m5 5 10 7L5 19V5Z" fill="currentColor" stroke="none" />
          <path d="M19 5v14" />
        </>
      )}
      {name === 'sparkles' && (
        <>
          <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Zm13-1 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
        </>
      )}
      {name === 'stop' && (
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
      )}
      {name === 'youtube' && (
        <>
          <path d="M21 12c0 3.2-.4 5.2-.8 6-.4.7-1 1.1-1.8 1.3-1.5.4-6.4.4-6.4.4s-4.9 0-6.4-.4c-.8-.2-1.4-.6-1.8-1.3C3.4 17.2 3 15.2 3 12s.4-5.2.8-6c.4-.7 1-1.1 1.8-1.3C7.1 4.3 12 4.3 12 4.3s4.9 0 6.4.4c.8.2 1.4.6 1.8 1.3.4.8.8 2.8.8 6Z" />
          <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

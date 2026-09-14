export type Locale = 'es' | 'en';

export interface TutorialStepCopy {
  eyebrow: string;
  title: string;
  body: string;
  imageAlt: string;
}

export interface UiCopy {
  languageName: string;
  landingNavFeatures: string;
  landingNavHow: string;
  landingNavSources: string;
  landingLogin: string;
  landingDashboard: string;
  addBot: string;
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  heroPrimary: string;
  heroSecondary: string;
  heroNote: string;
  previewLive: string;
  previewTrack: string;
  previewArtist: string;
  previewQueue: string;
  previewListeners: string;
  promiseEyebrow: string;
  promiseTitle: string;
  promiseBody: string;
  featureFastTitle: string;
  featureFastBody: string;
  featureQualityTitle: string;
  featureQualityBody: string;
  featureSharedTitle: string;
  featureSharedBody: string;
  featureLightTitle: string;
  featureLightBody: string;
  howEyebrow: string;
  howTitle: string;
  howSteps: Array<{ title: string; body: string }>;
  sourcesEyebrow: string;
  sourcesTitle: string;
  youtubeTitle: string;
  youtubeBody: string;
  spotifyTitle: string;
  spotifyBody: string;
  safetyEyebrow: string;
  safetyTitle: string;
  safetyBody: string;
  safetyTokens: string;
  safetyPermissions: string;
  safetyTracking: string;
  faqEyebrow: string;
  faqTitle: string;
  faqs: Array<{ question: string; answer: string }>;
  finalTitle: string;
  finalBody: string;
  privacy: string;
  terms: string;
  footerTagline: string;
  dashboard: string;
  dashboardEyebrow: string;
  dashboardTitle: string;
  dashboardBody: string;
  howItWorks: string;
  logout: string;
  installed: string;
  notInstalled: string;
  openPlayer: string;
  openSettings: string;
  installHere: string;
  noServersTitle: string;
  noServersBody: string;
  backToServers: string;
  player: string;
  settings: string;
  playing: string;
  ready: string;
  channelWaiting: string;
  addToStart: string;
  controls: string;
  shuffle: string;
  resume: string;
  pause: string;
  skip: string;
  loop: string;
  stop: string;
  searchLabel: string;
  searchPlaceholder: string;
  add: string;
  upNext: string;
  queue: string;
  remove: string;
  moveUp: string;
  moveDown: string;
  emptyQueue: string;
  controlApplied: string;
  settingsSaved: string;
  loading: string;
  loginRequiredTitle: string;
  loginRequiredBody: string;
  loginPrivacy: string;
  administration: string;
  language: string;
  commandChannel: string;
  anyChannel: string;
  djRole: string;
  noDjRole: string;
  saveSettings: string;
  spotifyConnected: string;
  spotifyNotConnected: string;
  spotifyUnavailable: string;
  spotifyConnect: string;
  spotifyReconnect: string;
  spotifyDisconnect: string;
  spotifyDisconnected: string;
  tutorialTitle: string;
  tutorialIntro: string;
  tutorialNext: string;
  tutorialPrevious: string;
  tutorialFinish: string;
  tutorialSkip: string;
  tutorialSteps: TutorialStepCopy[];
  legalPrivacyTitle: string;
  legalPrivacyBody: string[];
  legalTermsTitle: string;
  legalTermsBody: string[];
  backHome: string;
  added(count: number): string;
  resolvingRemaining(count: number): string;
}

export const UI_COPY: Record<Locale, UiCopy> = {
  es: {
    languageName: 'English',
    landingNavFeatures: 'Ventajas',
    landingNavHow: 'Cómo funciona',
    landingNavSources: 'Fuentes',
    landingLogin: 'Acceder',
    landingDashboard: 'Ir al dashboard',
    addBot: 'Añadir a Discord',
    heroEyebrow: 'MÚSICA PARA DISCORD, SIN RUIDO',
    heroTitle: 'Tu servidor ya tiene conversación. Ponle ritmo.',
    heroBody:
      'Lucio reproduce música con rapidez, sonido limpio y controles que todo el servidor entiende. Desde Discord o desde una web sincronizada.',
    heroPrimary: 'Añadir Lucio',
    heroSecondary: 'Ver cómo funciona',
    heroNote: 'YouTube funciona al instante. Spotify es opcional y se vincula por servidor.',
    previewLive: 'REPRODUCIENDO',
    previewTrack: 'Midnight Signal',
    previewArtist: 'Lucio Sessions',
    previewQueue: '3 en cola',
    previewListeners: '5 oyentes',
    promiseEyebrow: 'HECHO PARA QUEDARSE EN SEGUNDO PLANO',
    promiseTitle: 'Menos espera. Más música.',
    promiseBody:
      'Lucio evita funciones innecesarias y concentra sus recursos en resolver, conectar y reproducir bien.',
    featureFastTitle: 'Respuesta rápida',
    featureFastBody:
      'Conecta la voz mientras resuelve la canción y prepara la siguiente antes de que la necesites.',
    featureQualityTitle: 'Audio cuidado',
    featureQualityBody:
      'Prioriza Opus compatible con Discord y solo recodifica cuando la fuente lo necesita.',
    featureSharedTitle: 'Un control compartido',
    featureSharedBody:
      'La cola y el reproductor permanecen sincronizados entre los comandos y el dashboard.',
    featureLightTitle: 'Ligero por diseño',
    featureLightBody:
      'Un servicio compacto, sin reproducción en el navegador ni capas que resten estabilidad.',
    howEyebrow: 'EN CINCO PASOS',
    howTitle: 'De cero a música en menos interacciones.',
    howSteps: [
      { title: 'Añade Lucio', body: 'Elige uno de los servidores que administras.' },
      { title: 'Entra en voz', body: 'Lucio reproduce en el canal donde ya estás.' },
      {
        title: 'Configura si quieres',
        body: 'Vincula Spotify con `/setup` o continúa con YouTube.',
      },
      { title: 'Pide una canción', body: 'Usa `/play` o escribe desde el dashboard.' },
      {
        title: 'Controlad juntos',
        body: 'Pausa, salta y ordena la cola desde cualquier interfaz.',
      },
    ],
    sourcesEyebrow: 'DOS PUERTAS, UN MISMO REPRODUCTOR',
    sourcesTitle: 'Busca como prefieras.',
    youtubeTitle: 'YouTube',
    youtubeBody: 'Búsquedas, vídeos y playlists disponibles sin configurar una cuenta adicional.',
    spotifyTitle: 'Spotify',
    spotifyBody:
      'Pistas, álbumes y playlists propias o colaborativas mediante una vinculación segura por servidor.',
    safetyEyebrow: 'PRIVACIDAD SIN LETRA PEQUEÑA',
    safetyTitle: 'Solo pedimos lo necesario.',
    safetyBody:
      'Lucio separa cada servidor, protege las autorizaciones y no crea un historial de escucha.',
    safetyTokens: 'Tokens de Spotify cifrados',
    safetyPermissions: 'Permisos mínimos de Discord',
    safetyTracking: 'Sin analítica ni cookies publicitarias',
    faqEyebrow: 'PREGUNTAS FRECUENTES',
    faqTitle: 'Lo importante, antes de invitarlo.',
    faqs: [
      {
        question: '¿Necesito Spotify para usar Lucio?',
        answer: 'No. YouTube funciona desde el primer momento y Spotify es completamente opcional.',
      },
      {
        question: '¿Lucio reproduce directamente desde Spotify?',
        answer:
          'No. Spotify aporta metadatos autorizados y Lucio busca una fuente reproducible equivalente en YouTube.',
      },
      {
        question: '¿Qué playlists de Spotify admite?',
        answer:
          'Las que pertenezcan a la cuenta vinculada o en las que esa cuenta sea colaboradora, según las restricciones actuales de Spotify.',
      },
      {
        question: '¿Quién puede cambiar la configuración?',
        answer:
          'Solo usuarios con permisos para gestionar el servidor. Los controles de música requieren estar en el canal de voz activo.',
      },
    ],
    finalTitle: 'La próxima canción puede empezar aquí.',
    finalBody: 'Añade Lucio, entra en un canal y deja que la música acompañe al servidor.',
    privacy: 'Privacidad',
    terms: 'Condiciones',
    footerTagline: 'Música ligera para Discord.',
    dashboard: 'Dashboard',
    dashboardEyebrow: 'TUS SERVIDORES',
    dashboardTitle: '¿Dónde ponemos música?',
    dashboardBody:
      'Administra Lucio en los servidores donde tienes permisos o añádelo donde todavía no esté.',
    howItWorks: 'Cómo funciona',
    logout: 'Salir',
    installed: 'Lucio instalado',
    notInstalled: 'Pendiente de instalar',
    openPlayer: 'Abrir reproductor',
    openSettings: 'Configurar',
    installHere: 'Añadir aquí',
    noServersTitle: 'No encontramos servidores administrables',
    noServersBody:
      'Necesitas ser propietario o tener permisos para gestionar un servidor en Discord.',
    backToServers: 'Todos los servidores',
    player: 'Reproductor',
    settings: 'Configuración',
    playing: 'REPRODUCIENDO',
    ready: 'LUCIO ESTÁ LISTO',
    channelWaiting: 'El canal te espera',
    addToStart: 'Añade una canción para comenzar',
    controls: 'Controles de reproducción',
    shuffle: 'Mezclar',
    resume: 'Reanudar',
    pause: 'Pausar',
    skip: 'Saltar',
    loop: 'Cambiar repetición',
    stop: 'Parar',
    searchLabel: 'Busca una canción o pega un enlace',
    searchPlaceholder: 'Artista, canción, YouTube o Spotify…',
    add: 'Añadir',
    upNext: 'A CONTINUACIÓN',
    queue: 'Cola',
    remove: 'Eliminar',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    emptyQueue: 'Todavía no hay canciones en cola.',
    controlApplied: 'Control aplicado.',
    settingsSaved: 'Configuración guardada.',
    loading: 'Cargando',
    loginRequiredTitle: 'Entra para abrir tu dashboard.',
    loginRequiredBody:
      'Discord nos dirá qué servidores puedes administrar. Nunca pediremos tu contraseña.',
    loginPrivacy: 'Lucio solo solicita tu identidad y lista de servidores.',
    administration: 'ADMINISTRACIÓN',
    language: 'Idioma',
    commandChannel: 'Canal de comandos',
    anyChannel: 'Cualquier canal',
    djRole: 'Rol DJ',
    noDjRole: 'Sin rol DJ',
    saveSettings: 'Guardar ajustes',
    spotifyConnected: 'Cuenta vinculada para este servidor.',
    spotifyNotConnected: 'Sin vincular. YouTube se usará de forma predeterminada.',
    spotifyUnavailable: 'Integración no disponible.',
    spotifyConnect: 'Vincular',
    spotifyReconnect: 'Volver a vincular',
    spotifyDisconnect: 'Desconectar',
    spotifyDisconnected: 'Spotify se ha desconectado.',
    tutorialTitle: 'Así funciona Lucio',
    tutorialIntro: 'Cinco pasos para pasar del dashboard a la música.',
    tutorialNext: 'Siguiente',
    tutorialPrevious: 'Anterior',
    tutorialFinish: 'Empezar',
    tutorialSkip: 'Omitir tutorial',
    tutorialSteps: [
      {
        eyebrow: 'PASO 1 DE 5',
        title: 'Elige un servidor',
        body: 'Las cards separan los servidores con Lucio de aquellos donde todavía puedes añadirlo.',
        imageAlt: 'Dashboard de Lucio con dos cards de servidores',
      },
      {
        eyebrow: 'PASO 2 DE 5',
        title: 'Entra en un canal de voz',
        body: 'El reproductor seguirá tu canal. Solo las personas que estén allí podrán controlarlo.',
        imageAlt: 'Canal de voz de Discord con varios participantes',
      },
      {
        eyebrow: 'PASO 3 DE 5',
        title: 'Spotify es opcional',
        body: 'Un administrador puede ejecutar `/setup` y vincular una cuenta. Sin hacerlo, YouTube continúa disponible.',
        imageAlt: 'Comando setup de Discord con el botón para vincular Spotify',
      },
      {
        eyebrow: 'PASO 4 DE 5',
        title: 'Añade la primera canción',
        body: 'Busca por título, pega un enlace o usa `/play`. Lucio se conecta y prepara la reproducción.',
        imageAlt: 'Reproductor web de Lucio añadiendo una canción',
      },
      {
        eyebrow: 'PASO 5 DE 5',
        title: 'Controla la cola en equipo',
        body: 'Discord y la web comparten canción, progreso, cola, pausa, salto y repetición en tiempo real.',
        imageAlt: 'Cola musical sincronizada entre Discord y el dashboard',
      },
    ],
    legalPrivacyTitle: 'Privacidad',
    legalPrivacyBody: [
      'Lucio utiliza OAuth de Discord para identificarte y mostrar únicamente los servidores que puedes gestionar. No recibe ni almacena tu contraseña.',
      'Guardamos tu identificador de Discord para recordar que completaste el tutorial. Las sesiones web caducan y permanecen en memoria.',
      'Si un administrador vincula Spotify, se conserva únicamente el refresh token cifrado necesario para ese servidor. No almacenamos búsquedas ni historial de escucha.',
      'No utilizamos analítica, publicidad ni cookies de seguimiento. Las cookies existentes son técnicas y necesarias para iniciar sesión de forma segura.',
    ],
    legalTermsTitle: 'Condiciones de uso',
    legalTermsBody: [
      'Lucio es una herramienta para controlar música en servidores de Discord. Debes utilizarla respetando los derechos del contenido y las condiciones de Discord, Spotify y YouTube.',
      'La disponibilidad de fuentes externas no está garantizada. Los cambios o límites de sus proveedores pueden interrumpir temporalmente una integración.',
      'Spotify se utiliza para metadatos autorizados y no para descargar ni retransmitir su audio. Las playlists se limitan a las que la cuenta vinculada posea o pueda editar.',
      'Los administradores del servidor son responsables de configurar permisos, canales y acceso de sus miembros.',
    ],
    backHome: 'Volver al inicio',
    added: (count) => `${count} pista${count === 1 ? '' : 's'} añadida${count === 1 ? '' : 's'}.`,
    resolvingRemaining: (count) =>
      `Primera pista añadida. Preparando hasta ${count} más en segundo plano.`,
  },
  en: {
    languageName: 'Español',
    landingNavFeatures: 'Benefits',
    landingNavHow: 'How it works',
    landingNavSources: 'Sources',
    landingLogin: 'Log in',
    landingDashboard: 'Open dashboard',
    addBot: 'Add to Discord',
    heroEyebrow: 'MUSIC FOR DISCORD, WITHOUT THE NOISE',
    heroTitle: 'Your server has the conversation. Give it rhythm.',
    heroBody:
      'Lucio plays music quickly, with clean sound and controls everyone understands. From Discord or a synchronized web dashboard.',
    heroPrimary: 'Add Lucio',
    heroSecondary: 'See how it works',
    heroNote: 'YouTube works instantly. Spotify is optional and connected per server.',
    previewLive: 'NOW PLAYING',
    previewTrack: 'Midnight Signal',
    previewArtist: 'Lucio Sessions',
    previewQueue: '3 queued',
    previewListeners: '5 listeners',
    promiseEyebrow: 'BUILT TO STAY OUT OF THE WAY',
    promiseTitle: 'Less waiting. More music.',
    promiseBody:
      'Lucio skips unnecessary features and focuses its resources on resolving, connecting, and playing well.',
    featureFastTitle: 'Fast response',
    featureFastBody:
      'It connects to voice while resolving the track and prepares the next one before you need it.',
    featureQualityTitle: 'Thoughtful audio',
    featureQualityBody:
      'It prioritizes Discord-compatible Opus and only transcodes when the source requires it.',
    featureSharedTitle: 'One shared control',
    featureSharedBody: 'The queue and player stay synchronized between commands and dashboard.',
    featureLightTitle: 'Lightweight by design',
    featureLightBody:
      'A compact service, without browser playback or extra layers that reduce stability.',
    howEyebrow: 'FIVE STEPS',
    howTitle: 'From zero to music with fewer interactions.',
    howSteps: [
      { title: 'Add Lucio', body: 'Choose one of the servers you manage.' },
      { title: 'Join voice', body: 'Lucio plays in the channel you are already in.' },
      { title: 'Configure if you want', body: 'Connect Spotify with `/setup` or keep YouTube.' },
      { title: 'Request a track', body: 'Use `/play` or type from the dashboard.' },
      {
        title: 'Control it together',
        body: 'Pause, skip, and order the queue from either interface.',
      },
    ],
    sourcesEyebrow: 'TWO DOORS, ONE PLAYER',
    sourcesTitle: 'Search however you prefer.',
    youtubeTitle: 'YouTube',
    youtubeBody: 'Searches, videos, and playlists with no additional account setup.',
    spotifyTitle: 'Spotify',
    spotifyBody:
      'Tracks, albums, and owned or collaborative playlists through a secure per-server connection.',
    safetyEyebrow: 'PRIVACY WITHOUT THE FINE PRINT',
    safetyTitle: 'We only ask for what we need.',
    safetyBody:
      'Lucio separates every server, protects authorizations, and creates no listening history.',
    safetyTokens: 'Encrypted Spotify tokens',
    safetyPermissions: 'Minimum Discord permissions',
    safetyTracking: 'No analytics or advertising cookies',
    faqEyebrow: 'FREQUENTLY ASKED QUESTIONS',
    faqTitle: 'What matters before you invite it.',
    faqs: [
      {
        question: 'Do I need Spotify?',
        answer: 'No. YouTube works immediately and Spotify is entirely optional.',
      },
      {
        question: 'Does Lucio stream directly from Spotify?',
        answer:
          'No. Spotify provides authorized metadata and Lucio finds an equivalent playable source on YouTube.',
      },
      {
        question: 'Which Spotify playlists work?',
        answer:
          'Playlists owned by the connected account or where that account is a collaborator, following Spotify’s current restrictions.',
      },
      {
        question: 'Who can change settings?',
        answer:
          'Only members who can manage the server. Music controls require being in the active voice channel.',
      },
    ],
    finalTitle: 'The next track can start here.',
    finalBody: 'Add Lucio, join a channel, and let music accompany your server.',
    privacy: 'Privacy',
    terms: 'Terms',
    footerTagline: 'Lightweight music for Discord.',
    dashboard: 'Dashboard',
    dashboardEyebrow: 'YOUR SERVERS',
    dashboardTitle: 'Where should we play music?',
    dashboardBody:
      'Manage Lucio where you have permission, or add it to servers where it is not installed yet.',
    howItWorks: 'How it works',
    logout: 'Log out',
    installed: 'Lucio installed',
    notInstalled: 'Not installed yet',
    openPlayer: 'Open player',
    openSettings: 'Configure',
    installHere: 'Add here',
    noServersTitle: 'No manageable servers found',
    noServersBody: 'You must own or have permission to manage a Discord server.',
    backToServers: 'All servers',
    player: 'Player',
    settings: 'Settings',
    playing: 'NOW PLAYING',
    ready: 'LUCIO IS READY',
    channelWaiting: 'Your channel is waiting',
    addToStart: 'Add a track to get started',
    controls: 'Playback controls',
    shuffle: 'Shuffle',
    resume: 'Resume',
    pause: 'Pause',
    skip: 'Skip',
    loop: 'Change repeat mode',
    stop: 'Stop',
    searchLabel: 'Search for a track or paste a link',
    searchPlaceholder: 'Artist, track, YouTube or Spotify…',
    add: 'Add',
    upNext: 'UP NEXT',
    queue: 'Queue',
    remove: 'Remove',
    moveUp: 'Move up',
    moveDown: 'Move down',
    emptyQueue: 'There are no tracks in the queue yet.',
    controlApplied: 'Control applied.',
    settingsSaved: 'Settings saved.',
    loading: 'Loading',
    loginRequiredTitle: 'Log in to open your dashboard.',
    loginRequiredBody:
      'Discord will tell us which servers you can manage. We never receive your password.',
    loginPrivacy: 'Lucio only requests your identity and server list.',
    administration: 'ADMINISTRATION',
    language: 'Language',
    commandChannel: 'Command channel',
    anyChannel: 'Any channel',
    djRole: 'DJ role',
    noDjRole: 'No DJ role',
    saveSettings: 'Save settings',
    spotifyConnected: 'Account connected for this server.',
    spotifyNotConnected: 'Not connected. YouTube will be used by default.',
    spotifyUnavailable: 'Integration unavailable.',
    spotifyConnect: 'Connect',
    spotifyReconnect: 'Reconnect',
    spotifyDisconnect: 'Disconnect',
    spotifyDisconnected: 'Spotify has been disconnected.',
    tutorialTitle: 'How Lucio works',
    tutorialIntro: 'Five steps from dashboard to music.',
    tutorialNext: 'Next',
    tutorialPrevious: 'Previous',
    tutorialFinish: 'Get started',
    tutorialSkip: 'Skip tutorial',
    tutorialSteps: [
      {
        eyebrow: 'STEP 1 OF 5',
        title: 'Choose a server',
        body: 'Cards separate servers with Lucio from those where you can still add it.',
        imageAlt: 'Lucio dashboard with two server cards',
      },
      {
        eyebrow: 'STEP 2 OF 5',
        title: 'Join a voice channel',
        body: 'The player follows your channel. Only people there can control it.',
        imageAlt: 'Discord voice channel with several participants',
      },
      {
        eyebrow: 'STEP 3 OF 5',
        title: 'Spotify is optional',
        body: 'An admin can run `/setup` and connect an account. Without it, YouTube remains available.',
        imageAlt: 'Discord setup command with a Spotify connection button',
      },
      {
        eyebrow: 'STEP 4 OF 5',
        title: 'Add the first track',
        body: 'Search by title, paste a link, or use `/play`. Lucio connects and prepares playback.',
        imageAlt: 'Lucio web player adding a track',
      },
      {
        eyebrow: 'STEP 5 OF 5',
        title: 'Control the queue together',
        body: 'Discord and web share track, progress, queue, pause, skip, and repeat in real time.',
        imageAlt: 'Music queue synchronized between Discord and dashboard',
      },
    ],
    legalPrivacyTitle: 'Privacy',
    legalPrivacyBody: [
      'Lucio uses Discord OAuth to identify you and show only servers you can manage. It never receives or stores your password.',
      'We store your Discord identifier to remember that you completed onboarding. Web sessions expire and remain in memory.',
      'If an administrator connects Spotify, only the encrypted refresh token required for that server is stored. We do not keep searches or listening history.',
      'We use no analytics, advertising, or tracking cookies. Existing cookies are technical and required for secure sign-in.',
    ],
    legalTermsTitle: 'Terms of use',
    legalTermsBody: [
      'Lucio controls music in Discord servers. You must use it in accordance with content rights and the terms of Discord, Spotify, and YouTube.',
      'External source availability is not guaranteed. Provider changes or limits may temporarily interrupt an integration.',
      'Spotify is used for authorized metadata, not to download or retransmit its audio. Playlists are limited to those the connected account owns or can edit.',
      'Server administrators are responsible for configuring permissions, channels, and member access.',
    ],
    backHome: 'Back home',
    added: (count) => `${count} track${count === 1 ? '' : 's'} added.`,
    resolvingRemaining: (count) =>
      `First track added. Preparing up to ${count} more in the background.`,
  },
};

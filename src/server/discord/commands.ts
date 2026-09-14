import { ChannelType, SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configura Lucio y vincula Spotify')
    .setDescriptionLocalizations({ 'en-US': 'Configure Lucio and connect Spotify' }),
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Busca o añade música a la cola')
    .setDescriptionLocalizations({ 'en-US': 'Search for music or add it to the queue' })
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Búsqueda o enlace')
        .setDescriptionLocalizations({ 'en-US': 'Search or URL' })
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Muestra la cola')
    .setDescriptionLocalizations({ 'en-US': 'Show the queue' }),
  new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Muestra la pista actual')
    .setDescriptionLocalizations({ 'en-US': 'Show the current track' }),
  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pausa la reproducción')
    .setDescriptionLocalizations({ 'en-US': 'Pause playback' }),
  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Reanuda la reproducción')
    .setDescriptionLocalizations({ 'en-US': 'Resume playback' }),
  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Salta o vota para saltar')
    .setDescriptionLocalizations({ 'en-US': 'Skip or vote to skip' }),
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Detiene y limpia la cola')
    .setDescriptionLocalizations({ 'en-US': 'Stop and clear the queue' }),
  new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Desconecta a Lucio')
    .setDescriptionLocalizations({ 'en-US': 'Disconnect Lucio' }),
  new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Elimina una pista de la cola')
    .setDescriptionLocalizations({ 'en-US': 'Remove a track from the queue' })
    .addIntegerOption((option) =>
      option
        .setName('position')
        .setDescription('Posición')
        .setDescriptionLocalizations({ 'en-US': 'Position' })
        .setRequired(true)
        .setMinValue(1),
    ),
  new SlashCommandBuilder()
    .setName('move')
    .setDescription('Mueve una pista dentro de la cola')
    .setDescriptionLocalizations({ 'en-US': 'Move a queued track' })
    .addIntegerOption((option) =>
      option
        .setName('from')
        .setDescription('Posición actual')
        .setDescriptionLocalizations({ 'en-US': 'Current position' })
        .setRequired(true)
        .setMinValue(1),
    )
    .addIntegerOption((option) =>
      option
        .setName('to')
        .setDescription('Nueva posición')
        .setDescriptionLocalizations({ 'en-US': 'New position' })
        .setRequired(true)
        .setMinValue(1),
    ),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Vacía la cola')
    .setDescriptionLocalizations({ 'en-US': 'Clear the queue' }),
  new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Mezcla la cola')
    .setDescriptionLocalizations({ 'en-US': 'Shuffle the queue' }),
  new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Configura la repetición')
    .setDescriptionLocalizations({ 'en-US': 'Set repeat mode' })
    .addStringOption((option) =>
      option
        .setName('mode')
        .setDescription('Modo')
        .setDescriptionLocalizations({ 'en-US': 'Mode' })
        .setRequired(true)
        .addChoices(
          { name: 'Desactivado', value: 'off', name_localizations: { 'en-US': 'Off' } },
          { name: 'Pista', value: 'track', name_localizations: { 'en-US': 'Track' } },
          { name: 'Cola', value: 'queue', name_localizations: { 'en-US': 'Queue' } },
        ),
    ),
  new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Activa o desactiva autoplay')
    .setDescriptionLocalizations({ 'en-US': 'Enable or disable autoplay' })
    .addBooleanOption((option) =>
      option
        .setName('enabled')
        .setDescription('Estado')
        .setDescriptionLocalizations({ 'en-US': 'State' })
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configura Lucio')
    .setDescriptionLocalizations({ 'en-US': 'Configure Lucio' })
    .setDefaultMemberPermissions('32')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('language')
        .setDescription('Cambia el idioma')
        .setDescriptionLocalizations({ 'en-US': 'Change language' })
        .addStringOption((option) =>
          option
            .setName('value')
            .setDescription('Idioma')
            .setDescriptionLocalizations({ 'en-US': 'Language' })
            .setRequired(true)
            .addChoices({ name: 'Español', value: 'es' }, { name: 'English', value: 'en' }),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Limita los comandos a un canal')
        .setDescriptionLocalizations({ 'en-US': 'Restrict commands to a channel' })
        .addChannelOption((option) =>
          option
            .setName('value')
            .setDescription('Canal; omite para quitar el límite')
            .setDescriptionLocalizations({ 'en-US': 'Channel; omit to remove the restriction' })
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('dj-role')
        .setDescription('Configura el rol DJ')
        .setDescriptionLocalizations({ 'en-US': 'Configure the DJ role' })
        .addRoleOption((option) =>
          option
            .setName('value')
            .setDescription('Rol; omite para eliminarlo')
            .setDescriptionLocalizations({ 'en-US': 'Role; omit to remove it' }),
        ),
    ),
].map((command) => command.toJSON());

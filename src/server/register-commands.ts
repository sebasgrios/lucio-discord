import { REST, Routes } from 'discord.js';
import { loadConfig } from './config.js';
import { commands } from './discord/commands.js';

const config = loadConfig();
if (!config.DISCORD_TOKEN || !config.DISCORD_CLIENT_ID) {
  throw new Error('DISCORD_TOKEN y DISCORD_CLIENT_ID son necesarios para registrar comandos.');
}

const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
const route = config.DEV_GUILD_ID
  ? Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DEV_GUILD_ID)
  : Routes.applicationCommands(config.DISCORD_CLIENT_ID);

await rest.put(route, { body: commands });
process.stdout.write(`Sincronizados ${commands.length} comandos.\n`);

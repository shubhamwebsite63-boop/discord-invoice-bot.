import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder().setName("invoice").setDescription("Start invoice"),
  new SlashCommandBuilder().setName("invoice-generate").setDescription("Generate invoice preview")
];

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

console.log("✅ Slash commands deployed.");const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Refreshing application (/) commands...');
    // Use guild commands for instant registration while testing: requires GUILD_ID in env
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
      console.log('✅ Registered guild commands.');
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('✅ Registered global commands (may take up to 1 hour).');
    }
  } catch (err) {
    console.error('Error registering commands:', err);
  }
})();

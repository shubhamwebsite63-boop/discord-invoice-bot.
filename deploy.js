import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";

const commands = [
  new SlashCommandBuilder()
    .setName("invoice")
    .setDescription("Generate an invoice")
    .addUserOption(option =>
      option.setName("user").setDescription("Customer").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("product").setDescription("Product Name").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("price").setDescription("Price").setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered");
  } catch (error) {
    console.error(error);
  }
})();

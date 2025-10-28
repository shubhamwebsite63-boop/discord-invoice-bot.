require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder().setName("invoice_buyer").setDescription("Set buyer info")
    .addStringOption(o => o.setName("name").setDescription("Buyer Name").setRequired(true))
    .addStringOption(o => o.setName("username").setDescription("Buyer Username").setRequired(true)),
  new SlashCommandBuilder().setName("invoice_add").setDescription("Add product")
    .addStringOption(o => o.setName("item").setDescription("Item Name").setRequired(true))
    .addIntegerOption(o => o.setName("qty").setDescription("Quantity").setRequired(true))
    .addNumberOption(o => o.setName("price").setDescription("Unit Price").setRequired(true)),
  new SlashCommandBuilder().setName("invoice_generate").setDescription("Generate invoice"),
  new SlashCommandBuilder().setName("invoice_reset").setDescription("Reset invoice session"),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
  .then(() => console.log("✅ Slash Commands Registered"))
  .catch(console.error);

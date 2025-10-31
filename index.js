import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, Events } from "discord.js";
import express from "express";

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// KEEP ALIVE SERVER (Required for Render)
const app = express();
app.get('/', (req, res) => res.send('Bot is Running ✅'));
app.listen(3000, () => console.log("HTTP server running"));

// Create Bot Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Product list (editable anytime)
const PRODUCTS = [
  { label: "Nitro Booster 1M - $0.30", value: "nitro" },
  { label: "YouTube Premium 1M - $1", value: "ytprem" }
];

// Slash Commands
const commands = [
  new SlashCommandBuilder()
    .setName("invoice")
    .setDescription("Create an invoice")
];

// Register Commands Function
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("Slash commands registered ✅");
  } catch (error) {
    console.error(error);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "invoice") {
    const menu = new StringSelectMenuBuilder()
      .setCustomId("product_select")
      .setPlaceholder("Select a product")
      .addOptions(PRODUCTS);

    const row = new ActionRowBuilder().addComponents(menu);
    await interaction.reply({ content: "Choose your product:", components: [row] });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const product = PRODUCTS.find(p => p.value === interaction.values[0]);
  await interaction.reply(`✅ **Selected:** ${product.label}\nNow send quantity.`);
});

client.login(TOKEN);

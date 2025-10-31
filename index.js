import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Events
} from "discord.js";
import express from "express";

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// KEEP ALIVE (Render)
const app = express();
app.get("/", (req, res) => res.send("Bot Running ✅"));
app.listen(3000, () => console.log("🌐 Keep-Alive Server Active"));

// BOT CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// PRODUCTS LIST
const PRODUCTS = [
  { label: "Nitro Booster 1M - $0.30", value: "nitro", price: 0.30 },
  { label: "YouTube Premium 1M - $1", value: "ytprem", price: 1.00 }
];

// SLASH COMMAND
const commands = [
  new SlashCommandBuilder()
    .setName("invoice")
    .setDescription("Create an invoice")
];

// Register Commands
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log("Registering Slash Commands...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Slash Commands Registered");
  } catch (err) {
    console.log(err);
  }
}

// /invoice → Show product menu
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "invoice") return;

  const menu = new StringSelectMenuBuilder()
    .setCustomId("product_select")
    .setPlaceholder("Select a product")
    .addOptions(PRODUCTS);

  const row = new ActionRowBuilder().addComponents(menu);

  await interaction.reply({
    content: "🔽 **Select a product:**",
    components: [row]
  });
});

// Product selected → Ask for quantity
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const product = PRODUCTS.find(p => p.value === interaction.values[0]);

  await interaction.update({
    content: `✅ **Selected:** ${product.label}\n💬 Now type quantity in chat:`,
    components: []
  });

  const filter = (m) => m.author.id === interaction.user.id;
  const collector = interaction.channel.createMessageCollector({ filter, time: 20000, max: 1 });

  collector.on("collect", (msg) => {
    const qty = parseInt(msg.content);
    if (isNaN(qty) || qty <= 0) return msg.reply("❌ Send a valid **number**.");

    const total = (qty * product.price).toFixed(2);

    msg.reply(
      `🧾 **Invoice Generated:**\n\n` +
      `**Item:** ${product.label}\n` +
      `**Quantity:** ${qty}\n` +
      `**Total:** **$${total}** ✅`
    );
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      interaction.followUp("⌛ Time's up! Run `/invoice` again.");
    }
  });
});

registerCommands();
client.login(TOKEN);

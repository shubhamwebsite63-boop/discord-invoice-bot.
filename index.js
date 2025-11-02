import { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.TOKEN;

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// **YOUR PRODUCTS**
const products = [
  { label: "Hoodie", value: "Hoodie" },
  { label: "T-Shirt", value: "T-Shirt" },
  { label: "Keychain", value: "Keychain" }
];

// Store pending invoice info here
let waitingData = {};

client.on("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Slash command handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "invoice") {

    const menu = new StringSelectMenuBuilder()
      .setCustomId("select_product")
      .setPlaceholder("Select a product")
      .addOptions(products);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: "Select a product 👇",
      components: [row],
      ephemeral: false
    });
  }
});

// Product selection handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "select_product") return;

  const selectedProduct = interaction.values[0];

  waitingData[interaction.user.id] = { product: selectedProduct };

  await interaction.update({
    content: `**${selectedProduct} selected!**\n\nNow enter **quantity** in chat:`,
    components: []
  });
});

// Quantity listener
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const entry = waitingData[message.author.id];
  if (!entry) return;

  const qty = parseInt(message.content);
  if (isNaN(qty)) return message.reply("❌ Enter a **number** for quantity:");

  // Remove waiting state
  delete waitingData[message.author.id];

  // SEND TEMP INVOICE MESSAGE
  message.reply(
`🧾 **Invoice Generated**

**Product:** ${entry.product}
**Quantity:** ${qty}

**Sold By:** Mischief Bazzar
**Handled by:**
@pika.pikachuu
@adityaxdost

Prefix: **MB-XXXX**
`
  );
});

client.login(TOKEN);

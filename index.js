import { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  StringSelectMenuBuilder 
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// PRODUCT LIST – edit as needed
const products = [
  { label: "Hoodie", value: "Hoodie" },
  { label: "T-Shirt", value: "T-Shirt" },
  { label: "Keychain", value: "Keychain" }
];

let waitingData = {};

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Slash command
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "invoice") return;

  await interaction.deferReply(); // ✅ prevent "Unknown interaction"

  const menu = new StringSelectMenuBuilder()
    .setCustomId("select_product")
    .setPlaceholder("Select product")
    .addOptions(products);

  const row = new ActionRowBuilder().addComponents(menu);

  await interaction.editReply({
    content: "Select a product 👇",
    components: [row]
  });
});

// Product selection
client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "select_product") return;

  const product = interaction.values[0];
  waitingData[interaction.user.id] = { product };

  await interaction.update({
    content: `✅ **${product} selected!**\nNow send **quantity** in chat.`,
    components: []
  });
});

// Quantity input
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const pending = waitingData[message.author.id];
  if (!pending) return;

  const qty = parseInt(message.content);
  if (isNaN(qty)) return message.reply("❌ Send a **number** for quantity!");

  delete waitingData[message.author.id];

  return message.reply(
`🧾 **Invoice Generated**

**Product:** ${pending.product}
**Quantity:** ${qty}

**Sold By:** Mischief Bazzar
**Handled By:**
@pika.pikachuu
@adityaxdost

**Invoice Prefix:** MB-
`
  );
});

client.login(TOKEN);

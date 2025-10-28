import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits } from "discord.js";
import products from "./products.json" with { type: "json" };

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Per-channel invoice sessions
let sessions = {};

// Slash commands handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;

  const channelId = interaction.channel.id;

  // Start Invoice
  if (interaction.commandName === "invoice") {
    sessions[channelId] = { buyer: interaction.user.username, items: [] };

    const productMenu = new StringSelectMenuBuilder()
      .setCustomId("productSelect")
      .setPlaceholder("Select a product")
      .addOptions(products.map(p => ({
        label: p.name,
        description: `$${p.price.toFixed(2)}`,
        value: p.name
      })));

    return interaction.reply({
      content: `✅ Invoice started for **${interaction.user.username}**.\nSelect a product:`,
      components: [new ActionRowBuilder().addComponents(productMenu)]
    });
  }

  // Product Selected → Ask Quantity
  if (interaction.isStringSelectMenu() && interaction.customId === "productSelect") {
    const selectedProduct = products.find(p => p.name === interaction.values[0]);
    sessions[channelId].selected = selectedProduct;

    return interaction.reply(`📦 **${selectedProduct.name}** selected.\n➡️ Send quantity (just type a number):`);
  }
});

// Text message listener for quantity input
client.on("messageCreate", (msg) => {
  const channelId = msg.channel.id;
  if (!sessions[channelId] || !sessions[channelId].selected) return;
  if (msg.author.bot) return;

  const qty = parseInt(msg.content);
  if (isNaN(qty) || qty <= 0) return msg.reply("❌ Enter a valid number.");

  const item = sessions[channelId].selected;
  sessions[channelId].items.push({ name: item.name, qty, price: item.price });

  sessions[channelId].selected = null;

  msg.reply(`✅ Added **${qty} × ${item.name}** ($${item.price.toFixed(2)} each)\nType **/invoice generate** when done.`);
});

// Generate Invoice
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const channelId = interaction.channel.id;

  if (interaction.commandName === "invoice-generate") {
    const session = sessions[channelId];
    if (!session || session.items.length === 0) return interaction.reply("❌ No items added.");

    let total = 0;
    let list = session.items.map(i => {
      const t = i.qty * i.price;
      total += t;
      return `• ${i.qty} × ${i.name} = **$${t.toFixed(2)}**`;
    }).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🧾 Invoice Preview")
      .setDescription(list + `\n\n**Total: $${total.toFixed(2)}**`)
      .setColor("Blue");

    return interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.BOT_TOKEN);



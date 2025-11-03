import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  Events
} from "discord.js";
import express from "express";
import fs from "fs";
import PDFDocument from "pdfkit";

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Keep Alive
const app = express();
app.get("/", (req, res) => res.send("Bot Active ✅"));
app.listen(3000, () => console.log("🌐 Keep-Alive Running"));

// Bot Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Current Invoice Data (Cart + Buyer)
let CART = [];
let BUYER = "Customer";

// Default Product List
let PRODUCTS = [
  { label: "Nitro Booster 1M - ₹25", value: "nitro", price: 25 },
  { label: "YouTube Premium 1M - ₹80", value: "ytprem", price: 80 }
];

// Slash Commands
const commands = [
  new SlashCommandBuilder().setName("invoice").setDescription("Create invoice"),

  new SlashCommandBuilder()
    .setName("addproduct")
    .setDescription("Add a new product (Admin only)")
    .addStringOption(opt => opt.setName("name").setDescription("Product label").setRequired(true))
    .addNumberOption(opt => opt.setName("price").setDescription("Price").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("removeproduct")
    .setDescription("Remove a product (Admin only)")
    .addStringOption(opt => opt.setName("value").setDescription("Product value ID").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("setbuyer")
    .setDescription("Set buyer name")
    .addStringOption(opt => opt.setName("name").setDescription("Buyer name").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("clearinvoice")
    .setDescription("Clear current invoice")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

// Register Commands
(async () => {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Slash Commands Loaded");
})();

// /invoice Command
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "invoice") {
    const menu = new StringSelectMenuBuilder()
      .setCustomId("product_select")
      .setPlaceholder("Select a product to add")
      .addOptions(PRODUCTS);

    await interaction.reply({ content: "Select products (one at a time):", components: [new ActionRowBuilder().addComponents(menu)] });
  }

  if (interaction.commandName === "addproduct") {
    const name = interaction.options.getString("name");
    const price = interaction.options.getNumber("price");
    PRODUCTS.push({ label: `${name} - ₹${price}`, value: name.toLowerCase(), price });
    interaction.reply(`✅ Added Product: **${name}** for ₹${price}`);
  }

  if (interaction.commandName === "removeproduct") {
    const value = interaction.options.getString("value");
    PRODUCTS = PRODUCTS.filter(p => p.value !== value);
    interaction.reply(`🗑 Removed Product: ${value}`);
  }

  if (interaction.commandName === "setbuyer") {
    BUYER = interaction.options.getString("name");
    interaction.reply(`👤 Buyer set to: **${BUYER}**`);
  }

  if (interaction.commandName === "clearinvoice") {
    CART = [];
    interaction.reply("🧹 Invoice cleared.");
  }
});

// Product Selection
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  const product = PRODUCTS.find(p => p.value === interaction.values[0]);
  await interaction.reply(`Enter quantity for **${product.label}**:`);

  const filter = m => m.author.id === interaction.user.id;
  const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 20000 });

  collector.on("collect", msg => {
    const qty = parseInt(msg.content);
    if (isNaN(qty)) return msg.reply("❌ Invalid number");

    CART.push({ name: product.label, price: product.price, qty });
    msg.reply(`✅ Added **${qty}x ${product.label}**`);

    generateInvoicePDF(interaction.channel);
  });
});

// Create PDF & Send
function generateInvoicePDF(channel) {
  if (CART.length === 0) return channel.send("🛒 Cart empty.");

  let total = CART.reduce((a, b) => a + b.price * b.qty, 0);
  const invoiceNumber = `MB-${String(Date.now()).slice(-5)}`;
  const filePath = `invoices/${invoiceNumber}.pdf`;

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(22).text("MISCHIEF BAZZAR", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Handled by: @pika.pikachuu & @adityaxdost`);
  doc.text(`Buyer: ${BUYER}`);
  doc.moveDown();

  CART.forEach(i => doc.text(`${i.qty}× ${i.name} — ₹${i.price * i.qty}`));
  doc.moveDown();
  doc.text(`Total: ₹${total}`, { bold: true });
  doc.moveDown();
  doc.text(`Sold By MISCHIEF BAZZAR`, { align: "center" });

  doc.end();

  channel.send({ content: `🧾 **Invoice Generated:** ${invoiceNumber}`, files: [filePath] });

  CART = []; // clear after sending
}

client.login(TOKEN);
console.log("✅ Bot Started");

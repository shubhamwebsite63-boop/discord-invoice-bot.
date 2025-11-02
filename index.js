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
import PDFDocument from "pdfkit";
import fs from "fs";

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// KEEP ALIVE (Render)
const app = express();
app.get("/", (req, res) => res.send("Bot Running ✅"));
app.listen(3000, () => console.log("🌐 Keep-Alive Server Active"));

// BOT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// PRODUCTS WITH PRICE
const PRODUCTS = [
  { label: "Nitro Booster 1M - $0.30", value: "nitro", price: 0.30 },
  { label: "YouTube Premium 1M - $1", value: "yt", price: 1.00 }
];

// SLASH COMMAND
const commands = [
  new SlashCommandBuilder()
    .setName("invoice")
    .setDescription("Create an invoice"),
];

// REGISTER SLASH COMMANDS
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Slash Commands Registered");
}

// /invoice interaction
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "invoice") {
    const menu = new StringSelectMenuBuilder()
      .setCustomId("product_select")
      .setPlaceholder("Select a product")
      .addOptions(PRODUCTS);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: "Select a product:",
      components: [row]
    });
  }
});

// Product Select → Ask Quantity → Generate PDF
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const product = PRODUCTS.find(p => p.value === interaction.values[0]);

  await interaction.reply(`✅ **Selected:** ${product.label}\n➡️ Now type **quantity**`);

  const filter = (m) => m.author.id === interaction.user.id;
  const collector = interaction.channel.createMessageCollector({ filter, time: 20000, max: 1 });

  collector.on("collect", (msg) => {
    const qty = parseInt(msg.content);
    if (isNaN(qty) || qty <= 0) return msg.reply("❌ Invalid quantity. Try again.");

    const total = (qty * product.price).toFixed(2);
    const invoiceNumber = `MB-${Math.floor(Math.random() * 90000) + 10000}`;
    const fileName = `invoice_${invoiceNumber}.pdf`;

    // CREATE PDF
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(fileName));

    doc.fontSize(25).text("MISCHIEF BAZAAR", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Invoice No: ${invoiceNumber}`);
    doc.text(`Product: ${product.label}`);
    doc.text(`Quantity: ${qty}`);
    doc.text(`Total Amount: $${total}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.text("Handled By:\n@pika.pikachuu & @adityaxdost");
    doc.moveDown(2);
    doc.fontSize(12).text("Sold by Mischief Bazzar", { align: "center" });

    doc.end();

    doc.on("finish", () => {
      msg.reply({
        content: "🧾 **Invoice Generated:**",
        files: [fileName]
      });
    });
  });

  collector.on("end", collected => {
    if (collected.size === 0) interaction.followUp("⌛ Timeout. Use `/invoice` again.");
  });
});

registerCommands();
client.login(TOKEN);

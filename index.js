import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  Events,
  ActionRowBuilder,
  StringSelectMenuBuilder
} from "discord.js";
import express from "express";
import fs from "fs";
import PDFDocument from "pdfkit";

// ENV Variables
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Keep-alive server for Render
const app = express();
app.get("/", (req, res) => res.send("Mischief Bazzar Bot Active ✅"));
app.listen(3000, () => console.log("🌍 KeepAlive Server Running"));

// Create invoices directory if missing
if (!fs.existsSync("./invoices")) fs.mkdirSync("./invoices");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Products
const PRODUCTS = [
  { label: "Nitro Booster 1M - $0.30", value: "nitro", price: 0.30 },
  { label: "YouTube Premium 1M - $1", value: "ytprem", price: 1.00 }
];

// Slash command
const commands = [
  new SlashCommandBuilder().setName("invoice").setDescription("Create a PDF invoice")
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
}

client.on(Events.ClientReady, () => console.log(`✅ Logged in as ${client.user.tag}`));

// When /invoice is used
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "invoice") return;

  await interaction.deferReply(); // prevents timeout

  const menu = new StringSelectMenuBuilder()
    .setCustomId("product_select")
    .setPlaceholder("Select a product")
    .addOptions(PRODUCTS);

  const row = new ActionRowBuilder().addComponents(menu);

  await interaction.followUp({ content: "Select a product 👇", components: [row] });
});

// When product is selected
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const product = PRODUCTS.find(p => p.value === interaction.values[0]);
  await interaction.deferReply(); // prevents timeout

  await interaction.followUp(`✅ **Selected:** ${product.label}\nPlease enter **quantity**:`);

  const filter = msg => msg.author.id === interaction.user.id;
  const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 20000 });

  collector.on("collect", async (msg) => {
    const qty = parseInt(msg.content);

    if (isNaN(qty) || qty <= 0) {
      return msg.reply("❌ Invalid quantity. Try again.");
    }

    const total = (qty * product.price).toFixed(2);
    const invoiceNum = `MB-${Math.floor(10000 + Math.random() * 90000)}`;
    const filePath = `./invoices/${invoiceNum}.pdf`;

    // Create PDF
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(22).text("Mischief Bazzar Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Invoice No: ${invoiceNum}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Item: ${product.label}`);
    doc.text(`Quantity: ${qty}`);
    doc.text(`Total: $${total}`);
    doc.moveDown();
    doc.text("Handled By:");
    doc.text("@pika.pikachuu");
    doc.text("@adityaxdost");
    doc.moveDown();
    doc.text("Sold By: Mischief Bazzar", { align: "center" });
    doc.end();

    await msg.reply({ content: `🧾 **Invoice Generated!**\nInvoice No: **${invoiceNum}**`, files: [filePath] });
  });

  collector.on("end", c => {
    if (c.size === 0) interaction.followUp("⌛ Time out! Run `/invoice` again.");
  });
});

registerCommands();
client.login(TOKEN);

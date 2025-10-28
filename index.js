import { Client, GatewayIntentBits, Events } from "discord.js";
import fs from "fs";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

// for PDF file paths in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load environment variable
const TOKEN = process.env.BOT_TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Slash command: /invoice
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "invoice") return;

  const user = interaction.options.getUser("user");
  const product = interaction.options.getString("product");
  const price = interaction.options.getString("price");

  // Create PDF
  const invoicePath = path.join(__dirname, "invoice.pdf");
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(invoicePath));

  doc.fontSize(20).text("Invoice", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Customer: ${user.username}`);
  doc.text(`Product: ${product}`);
  doc.text(`Price: ₹${price}`);
  doc.end();

  await new Promise((resolve) => setTimeout(resolve, 500)); // ensure write done

  await interaction.reply({
    content: `✅ Invoice generated for **${user.username}**`,
    files: [invoicePath],
  });
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

client.login(TOKEN);

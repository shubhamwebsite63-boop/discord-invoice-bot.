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

// ENV VARIABLES
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Keep Alive Server (for Render)
const app = express();
app.get("/", (req, res) => res.send("Bot is Running ✅"));
app.listen(3000, () => console.log("🌐 Keep-Alive Server Active"));

// Discord Bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Product list (You can edit this anytime)
const PRODUCTS = [
  { label: "Nitro Booster 1M - $0.30", value: "nitro", price: 0.30 },
  { label: "YouTube Premium 1M - $1", value: "ytprem", price: 1.00 }
];

// Slash command
const commands = [
  new SlashCommandBuilder()
    .setName("invoice")
    .setDescription("Create an invoice")
];

// Register Commands
async function registerCommands() {
  if (!TOKEN) return console.log("❌ Missing TOKEN in environment variables!");

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log("Registering Slash Commands...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Slash Commands Registered");
  } catch (err) {
    console.log(err);
  }
}

// MAIN SINGLE INTERACTION HANDLER
client.on(Events.InteractionCreate, async (interaction) => {

  // Slash Command
  if (interaction.isChatInputCommand() && interaction.commandName === "invoice") {

    const menu = new StringSelectMenuBuilder()
      .setCustomId("product_select")
      .setPlaceholder("Select a product")
      .addOptions(PRODUCTS);

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      content: "🛒 Select a product:",
      components: [row]
    });
  }

  // Product Selection
  if (interaction.isStringSelectMenu()) {

    const product = PRODUCTS.find(p => p.value === interaction.values[0]);
    await interaction.reply(`✅ **Selected:** ${product.label}\n➡️ Now type **quantity**`);

    const filter = (m) => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 20000, max: 1 });

    collector.on("collect", (msg) => {
      const qty = parseInt(msg.content);

      if (isNaN(qty) || qty <= 0) {
        return msg.reply("❌ Invalid quantity. Try again.");
      }

      const total = (qty * product.price).toFixed(2);
      const invoiceNumber = `MB-${Math.floor(Math.random() * 90000) + 10000}`;
      const fileName = `${invoiceNumber}.pdf`;

      // ✅ PDF GENERATION
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(fileName));

      doc.fontSize(24).text("🧾 MISCHIEF BAZAAR", { align: "center" });
      doc.moveDown();
      doc.fontSize(14).text(`Invoice No: ${invoiceNumber}`);
      doc.text(`Product: ${product.label}`);
      doc.text(`Quantity: ${qty}`);
      doc.text(`Total: $${total}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();
      doc.text("Handled By:");
      doc.text("@pika.pikachuu");
      doc.text("@adityaxdost");
      doc.moveDown(2);
      doc.text("Sold By Mischief Bazzar", { align: "center" });

      doc.end();

      doc.on("finish", () => {
        msg.reply({
          content: "🧾 **Invoice Generated:**",
          files: [fileName]
        });
      });
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        interaction.followUp("⌛ Timeout. Run `/invoice` again.");
      }
    });
  }
});

// Start Bot
registerCommands();
client.login(TOKEN);

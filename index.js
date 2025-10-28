require("dotenv").config();
const { Client, GatewayIntentBits, AttachmentBuilder, Events } = require("discord.js");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const express = require("express");

// Keep Render alive
const app = express();
app.get("/", (req, res) => res.send("✅ Mischief Bazzar Slash Invoice Bot Running"));
app.listen(process.env.PORT || 3000);

// Discord Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Runtime Data
let buyer = null;
let cart = [];

// Slash Commands Handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // /invoice_buyer
  if (interaction.commandName === "invoice_buyer") {
    buyer = { name: interaction.options.getString("name"), username: interaction.options.getString("username") };
    cart = [];
    return interaction.reply(`✅ Buyer set: **${buyer.name} (@${buyer.username})**`);
  }

  // /invoice_add
  if (interaction.commandName === "invoice_add") {
    const item = interaction.options.getString("item");
    const qty = interaction.options.getInteger("qty");
    const price = interaction.options.getNumber("price");
    const total = qty * price;

    cart.push({ item, qty, price, total });
    return interaction.reply(`🛒 Added **${qty}× ${item}** @ ₹${price}`);
  }

  // /invoice_generate
  if (interaction.commandName === "invoice_generate") {
    if (!buyer) return interaction.reply("❌ Set buyer first using `/invoice_buyer`");
    if (cart.length === 0) return interaction.reply("❌ Add items using `/invoice_add`");

    const filename = `Invoice_${buyer.username}_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, filename);
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(22).text("Mischief Bazzar", { align: "center" });
    doc.fontSize(12).text("(A Unit Of BBC & Shararat)", { align: "center" });
    doc.moveDown(1);

    // Buyer
    doc.fontSize(14).text("Buyer Information:");
    doc.fontSize(12).text(`Name: ${buyer.name}`).text(`Username: @${buyer.username}`);
    doc.moveDown(1);

    // Table Header
    doc.fontSize(14).text("Product", 50).text("Qty", 230).text("Price", 300).text("Total", 380);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Line Items
    let grandTotal = 0;
    cart.forEach(p => {
      doc.fontSize(12).text(p.item, 50).text(p.qty.toString(), 230).text(`₹${p.price}`, 300).text(`₹${p.total}`, 380);
      grandTotal += p.total;
      doc.moveDown(0.4);
    });

    doc.moveDown(1);
    doc.fontSize(14).text(`Grand Total: ₹${grandTotal}`, { align: "right" });
    doc.fontSize(10).text("Sold by Mischief Bazzar", { align: "right" });

    doc.end();

    stream.on("finish", async () => {
      await interaction.reply({ files: [new AttachmentBuilder(filepath)] });
      fs.unlinkSync(filepath);
    });
  }

  // /invoice_reset
  if (interaction.commandName === "invoice_reset") {
    buyer = null;
    cart = [];
    return interaction.reply("🔄 Invoice session reset.");
  }
});

client.once("ready", () => console.log(`✅ Logged in as ${client.user.tag}`));
client.login(process.env.BOT_TOKEN);

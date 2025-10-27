require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const express = require('express');
const dayjs = require('dayjs');

// ---- Keep Render alive ----
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🧾 Mischief Bazzar Invoice Bot is running'));
app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));

// ---- Discord Bot Setup ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Mischief Bazzar Invoices 🧾' }],
    status: 'online',
  });
});

// ---- Invoice Data ----
let currentBuyer = null;
let items = [];

// ---- Command Handler ----
client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith('!')) return;

  const args = msg.content.trim().split(/\s+/);
  const cmd = args[0].toLowerCase();

  // --- Set Buyer ---
  if (cmd === '!buyer') {
    if (args.length < 3) return msg.reply('Usage: !buyer <BuyerName> <Username>');
    currentBuyer = { name: args[1], username: args[2] };
    items = [];
    return msg.reply(`✅ Buyer set to ${currentBuyer.name} (@${currentBuyer.username})`);
  }

  // --- Add Product ---
  if (cmd === '!additem') {
    if (args.length < 4) return msg.reply('Usage: !additem <Product> <Qty> <Price>');
    const [_, name, qty, price] = args;
    items.push({
      name,
      qty: parseInt(qty),
      price: parseFloat(price),
      total: parseInt(qty) * parseFloat(price),
    });
    return msg.reply(`🛒 Added ${qty}× ${name} @ ₹${price}`);
  }

  // --- Generate Invoice ---
  if (cmd === '!generate') {
    if (!currentBuyer) return msg.reply('❌ Set buyer first using !buyer');
    if (items.length === 0) return msg.reply('❌ Add items first using !additem');

    const invoiceNum = `INV-${Math.floor(Math.random() * 9000 + 1000)}`;
    const filename = `Invoice_${currentBuyer.username}_${Date.now()}.pdf`;
    const filepath = path.join('/tmp', filename); // ✅ works on Render

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // --- Optional Logo ---
    const logoPath = path.join(__dirname, 'logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 450, 30, { width: 100 });
      } catch (err) {
        console.log('⚠️ Could not load logo:', err.message);
      }
    }

    // --- Header ---
    doc.fontSize(22).font('Helvetica-Bold').text('Mischief Bazzar', 50, 40, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica-Oblique').text('(A Unit Of BBC & Shararat)', { align: 'center' });
    doc.moveDown(1.5);

    // --- Buyer Info ---
    doc.fontSize(14).font('Helvetica-Bold').text('Buyer Information:', 50, 130);
    doc.fontSize(12).font('Helvetica')
      .text(`Name: ${currentBuyer.name}`, 50, 150)
      .text(`Username: @${currentBuyer.username}`, 50, 165)
      .text(`Invoice No: ${invoiceNum}`, 50, 180)
      .text(`Date: ${dayjs().format('DD MMM YYYY, HH:mm')}`, 50, 195);

    doc.moveDown(2);

    // --- Table Header ---
    let y = 230;
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('Product', 50, y);
    doc.text('Qty', 250, y);
    doc.text('Price', 320, y);
    doc.text('Total', 400, y);
    doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();

    // --- Table Rows ---
    y += 25;
    doc.fontSize(12).font('Helvetica');
    let grandTotal = 0;
    items.forEach((it) => {
      doc.text(it.name, 50, y);
      doc.text(it.qty.toString(), 250, y);
      doc.text(`₹${it.price}`, 320, y);
      doc.text(`₹${it.total}`, 400, y);
      grandTotal += it.total;
      y += 20;
    });

    // --- Grand Total ---
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 15;
    doc.font('Helvetica-Bold').text(`Grand Total: ₹${grandTotal}`, 320, y);

    // --- Footer ---
    y += 50;
    doc.fontSize(10).font('Helvetica-Oblique').text('Sold By Mischief Bazzar', 400, y);
    y += 15;
    doc.fontSize(8).text(`Generated on ${dayjs().format('DD MMM YYYY, HH:mm')}`, 400, y);

    doc.end();

    stream.on('finish', async () => {
      try {
        const file = new AttachmentBuilder(filepath);
        await msg.channel.send({
          content: `🧾 Invoice for ${currentBuyer.name} (@${currentBuyer.username})`,
          files: [file],
        });
        fs.unlinkSync(filepath);
      } catch (err) {
        console.error('❌ Error sending invoice:', err);
        msg.reply('⚠️ Could not send invoice. Check permissions.');
      }
    });
  }

  // --- Reset ---
  if (cmd === '!reset') {
    currentBuyer = null;
    items = [];
    return msg.reply('🔄 Invoice session cleared.');
  }
});

// ---- Login ----
client.login(process.env.BOT_TOKEN);

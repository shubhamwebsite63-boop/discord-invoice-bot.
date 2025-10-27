require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const express = require('express');
const dayjs = require('dayjs');

// ---- Express server (Render uptime) ----
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('✅ Mischief Bazzar Bot is Running'));
app.listen(PORT, () => console.log(`🌐 HTTP server running on port ${PORT}`));

// ---- Discord Client ----
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Mischief Bazzar Invoices 🧾' }],
    status: 'online',
  });
});

// ---- Invoice Variables ----
let currentBuyer = null;
let items = [];

// ---- Command Handler ----
client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith('!')) return;

  const args = msg.content.trim().split(/\s+/);
  const cmd = args[0].toLowerCase();

  // --- Set Buyer ---
  if (cmd === '!buyer') {
    if (args.length < 3) return msg.reply('Usage: `!buyer <BuyerName> <Username>`');
    currentBuyer = { name: args[1], username: args[2] };
    items = [];
    return msg.reply(`✅ Buyer set to **${currentBuyer.name}** (@${currentBuyer.username})`);
  }

  // --- Add Product ---
  if (cmd === '!additem') {
    if (args.length < 4) return msg.reply('Usage: `!additem <Product> <Qty> <Price>`');
    const [_, name, qty, price] = args;
    items.push({
      name,
      qty: parseInt(qty),
      price: parseFloat(price),
      total: parseInt(qty) * parseFloat(price),
    });
    return msg.reply(`🛒 Added **${qty}× ${name}** @ ₹${price}`);
  }

  // --- Generate Invoice ---
 if (cmd === '!generate') {
  if (!currentBuyer) return msg.reply('❌ Set buyer first using `!buyer`');
  if (items.length === 0) return msg.reply('❌ Add items first using `!additem`');

  const invoiceNum = `INV-${Math.floor(Math.random() * 9000 + 1000)}`;
  const filename = `Invoice_${currentBuyer.username}_${Date.now()}.pdf`;
  const filepath = path.join('/tmp', filename); // ✅ use /tmp for Render

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // header + table (same as before)
  // ...
  doc.end();

  stream.on('finish', async () => {
    try {
      const file = new AttachmentBuilder(filepath);
      await msg.channel.send({
        content: `🧾 Invoice generated for **${currentBuyer.name}** (@${currentBuyer.username})`,
        files: [file],
      });
      fs.unlinkSync(filepath);
    } catch (err) {
      console.error('❌ Error sending invoice:', err);
      msg.reply('⚠️ Could not send invoice. Check bot permissions.');
    }
  });
}


    // --- Buyer Info ---
    doc.fontSize(14).font('Helvetica-Bold').text('Buyer Information');
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica')
      .text(`Name: ${currentBuyer.name}`)
      .text(`Username: @${currentBuyer.username}`)
      .text(`Invoice No: ${invoiceNum}`)
      .text(`Date: ${dayjs().format('DD MMM YYYY, HH:mm')}`);
    doc.moveDown(1);

    // --- Table Header ---
    doc.fontSize(14).font('Helvetica-Bold').text('Product', 50)
       .text('Qty', 250).text('Price', 320).text('Total', 400);
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    // --- Table Rows ---
    doc.fontSize(12).font('Helvetica');
    let grandTotal = 0;
    items.forEach(it => {
      doc.moveDown(0.3);
      doc.text(it.name, 50)
         .text(it.qty.toString(), 250)
         .text(`₹${it.price}`, 320)
         .text(`₹${it.total}`, 400);
      grandTotal += it.total;
    });

    doc.moveDown(1);
    doc.font('Helvetica-Bold').text(`Grand Total: ₹${grandTotal}`, { align: 'right' });
    doc.moveDown(1);

    // --- Footer ---
    doc.fontSize(10).font('Helvetica-Oblique').text('Sold by Mischief Bazzar', { align: 'right' });
    doc.moveDown(0.5);
    doc.fontSize(8).text('Thank you for shopping with us!', { align: 'center' });

    doc.end();

    doc.on('finish', async () => {
      const file = new AttachmentBuilder(filepath);
      await msg.channel.send({
        content: `🧾 Invoice generated for **${currentBuyer.name}** (@${currentBuyer.username})`,
        files: [file],
      });
      fs.unlinkSync(filepath);
    });
  }

  // --- Reset ---
  if (cmd === '!reset') {
    currentBuyer = null;
    items = [];
    return msg.reply('🔄 Session cleared.');
  }
});

// ---- Login ----
client.login(process.env.BOT_TOKEN);



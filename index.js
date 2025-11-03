// index.js — Final Mischief Bazzar Invoice Bot
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import express from 'express';
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Events,
  SlashCommandBuilder,
  AttachmentBuilder
} from 'discord.js';
const activeInvoices = {}; 
// Structure per guild: { buyer: "", items: [{product, quantity, price}] }

// ---------- CONFIG ----------
const TOKEN = process.env.TOKEN;         // set in Render env
const CLIENT_ID = process.env.CLIENT_ID; // set in Render env
const CURRENCY = '₹';                    // INR as you chose
const INVOICE_PREFIX = 'MB-';
const HANDLED_BY = ['@pika.pikachuu', '@adityaxdost'];
const STORE_NAME = 'Mischief Bazzar';
const SAVE_INVOICES_FILE = path.join(process.cwd(), 'invoices.json');
const PRODUCTS_FILE = path.join(process.cwd(), 'products.json');
const ASSETS_DIR = path.join(process.cwd(), 'assets'); // put logo.png here if you have one
const LOGO_PATH = path.join(ASSETS_DIR, 'logo.png');
// PDF style env: "both" will send a PDF file and also a simple embed text in chat
const PDF_STYLE = process.env.PDF_STYLE || 'both';

// ---------- Sanity checks ----------
if (!TOKEN || !CLIENT_ID) {
  console.error('Missing TOKEN or CLIENT_ID in environment variables. Set them in Render.');
  process.exit(1);
}

// ---------- Ensure invoices.json exists ----------
if (!fs.existsSync(SAVE_INVOICES_FILE)) fs.writeFileSync(SAVE_INVOICES_FILE, JSON.stringify([], null, 2));

// ---------- Load products ----------
let PRODUCTS = [];
try {
  PRODUCTS = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
} catch (e) {
  console.warn('products.json not found or invalid. Starting with empty product list.');
  PRODUCTS = [];
}

// ---------- Helper: read/write invoices ----------
function loadInvoices() {
  try {
    return JSON.parse(fs.readFileSync(SAVE_INVOICES_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}
function saveInvoices(arr) {
  fs.writeFileSync(SAVE_INVOICES_FILE, JSON.stringify(arr, null, 2));
}

// ---------- invoice number generator ----------
function nextInvoiceNo() {
  const arr = loadInvoices();
  const n = arr.length + 1;
  return INVOICE_PREFIX + String(n).padStart(3, '0');
}

// ---------- PDF generation ----------
async function generateInvoicePDF({ invoiceNo, buyerTag, items, total }) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(ASSETS_DIR)) {
        // create assets dir if missing (harmless)
        try { fs.mkdirSync(ASSETS_DIR); } catch {}
      }

      if (!fs.existsSync(path.join(process.cwd(), 'invoices'))) {
        try { fs.mkdirSync(path.join(process.cwd(), 'invoices')); } catch {}
      }

      const filename = `${invoiceNo}_${Date.now()}.pdf`;
      const filepath = path.join(process.cwd(), 'invoices', filename);
      const doc = new PDFDocument({ size: 'A4', margin: 40 });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Header: logo (if exists) + title
      if (fs.existsSync(LOGO_PATH)) {
        try {
          doc.image(LOGO_PATH, 40, 30, { width: 100 });
        } catch (e) {
          // ignore image errors
        }
      }
      doc.fontSize(20).text(STORE_NAME, { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(10).text('(A Unit Of BBC & Shararat)', { align: 'center' });
      doc.moveDown(1.2);

      // Invoice meta
      doc.fontSize(11).text(`Invoice No: ${invoiceNo}`);
      doc.text(`Buyer: ${buyerTag}`);
      doc.text(`Date: ${dayjs().format('DD MMM YYYY, HH:mm')}`);
      doc.moveDown(0.6);

      // Table header
      const startX = doc.x;
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('Product', startX, doc.y);
      doc.text('Qty', 350, doc.y);
      doc.text('Unit (INR)', 410, doc.y);
      doc.text('Total (INR)', 490, doc.y);
      doc.moveDown(0.3);
      doc.moveTo(startX, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.6);

      // Table rows
      doc.font('Helvetica').fontSize(11);
      items.forEach(it => {
        doc.text(it.name, startX, doc.y);
        doc.text(String(it.qty), 350, doc.y);
        doc.text(`${it.price.toFixed(2)}`, 410, doc.y);
        doc.text(`${(it.price * it.qty).toFixed(2)}`, 490, doc.y);
        doc.moveDown(0.6);
      });

      doc.moveDown(0.6);
      doc.moveTo(startX, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.8);

      // Total box
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(`Grand Total: ${CURRENCY}${total.toFixed(2)}`, { align: 'right' });
      doc.moveDown(1.5);

      // Handled by + footer
      doc.font('Helvetica').fontSize(10).text('Handled by:');
      HANDLED_BY.forEach(h => doc.text(h));
      doc.moveDown(1.2);
      doc.fontSize(9).text('Sold By ' + STORE_NAME, { align: 'right' });
      doc.moveDown(0.2);
      doc.fontSize(8).text(`Generated on ${dayjs().format('DD MMM YYYY, HH:mm')}`, { align: 'right' });

      doc.end();

      stream.on('finish', () => resolve({ filepath, filename }));
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

// ---------- Discord client ----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Sessions: per-channel or per-user waiting info
// We'll store waiting by userId so multiple channels/users ok
const waiting = new Map(); // userId => { invoiceNo, product }

// Slash commands (we register minimal commands programmatically)
const slashCommands = [
  new SlashCommandBuilder().setName('invoice').setDescription('Start an invoice'),
  new SlashCommandBuilder().setName('listproducts').setDescription('List products'),
  new SlashCommandBuilder()
    .setName('addproduct')
    .setDescription('Add new product (admin)')
    .addStringOption(o => o.setName('name').setDescription('Product name').setRequired(true))
    .addNumberOption(o => o.setName('price').setDescription('Price in INR').setRequired(true))
].map(c => c.toJSON());

// Register commands on startup
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommands });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Error registering commands:', err);
  }
}

// Single interaction handler that covers commands + select menu
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ---------- Chat command: /invoice ----------
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'invoice') {
        await interaction.deferReply({ ephemeral: false }); // prevents Unknown Interaction
        // build select menu
        const options = PRODUCTS.map(p => ({
          label: p.name,
          description: `₹${p.price.toFixed(2)}`,
          value: p.id
        }));
        const menu = new StringSelectMenuBuilder()
          .setCustomId('product_select')
          .setPlaceholder('Choose product')
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(menu);
        return interaction.editReply({ content: 'Select a product to add to invoice:', components: [row] });
      }

      if (interaction.commandName === 'listproducts') {
        const list = PRODUCTS.map(p => `• ${p.name} — ${CURRENCY}${p.price.toFixed(2)}`).join('\n') || 'No products.';
        return interaction.reply({ content: `Products:\n${list}`, ephemeral: true });
      }

      if (interaction.commandName === 'addproduct') {
        // simple admin add (no auth check — optionally add owner check)
        const name = interaction.options.getString('name');
        const price = interaction.options.getNumber('price');
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        PRODUCTS.push({ id, name, price });
        // persist to products.json
        try { fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(PRODUCTS, null, 2)); } catch (e) { console.warn('Write products failed:', e.message); }
        return interaction.reply({ content: `✅ Product added: ${name} — ${CURRENCY}${price.toFixed(2)}`, ephemeral: true });
      }
    }

    // ---------- Product selected via menu ----------
    if (interaction.isStringSelectMenu() && interaction.customId === 'product_select') {
      // user selected product(s) — we take first
      const selectedId = interaction.values[0];
      const product = PRODUCTS.find(p => p.id === selectedId);
      if (!product) return interaction.reply({ content: 'Product not found', ephemeral: true });

      const invoiceNo = nextInvoiceNo();
      // store waiting info
      waiting.set(interaction.user.id, { invoiceNo, product });

      // update interaction and ask for qty via normal message
      return interaction.update({ content: `✅ Selected **${product.name}**.\n➡️ Now type **quantity** in chat (e.g. 2).`, components: [] });
    }

  } catch (err) {
    console.error('Interaction handler error:', err);
    try {
      if (interaction && interaction.deferred) {
        await interaction.editReply({ content: '❌ Internal error occurred.' });
      } else if (interaction?.reply) {
        await interaction.reply({ content: '❌ Internal error occurred.', ephemeral: true });
      }
    } catch {}
  }
});

// ---------- Listen to normal messages to receive quantity ----------
client.on('messageCreate', async (msg) => {
  try {
    if (msg.author.bot) return;
    const wait = waiting.get(msg.author.id);
    if (!wait) return;

    const qty = parseInt(msg.content.replace(/[^0-9]/g, ''), 10);
    if (isNaN(qty) || qty <= 0) {
      return msg.reply('❌ Please send a valid quantity (a positive number).');
    }

    // finalize invoice
    const invoiceNo = wait.invoiceNo;
    const product = wait.product;
    const items = [{ id: product.id, name: product.name, qty, price: product.price }];
    const total = items.reduce((s, it) => s + it.price * it.qty, 0);

    // build invoice record
    const invoiceRecord = {
      invoiceNo,
      buyerTag: `${msg.author.username}#${msg.author.discriminator}`,
      buyerId: msg.author.id,
      items,
      total,
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
    };

    // append to invoices.json
    const all = loadInvoices();
    all.push(invoiceRecord);
    saveInvoices(all);

    // remove waiting state
    waiting.delete(msg.author.id);

    // Send chat preview (simple)
    const preview = [
      `🧾 **INVOICE** • ${STORE_NAME}`,
      `Invoice: **${invoiceNo}**`,
      `Buyer: <@${msg.author.id}>`,
      ...items.map(it => `• ${it.name} × ${it.qty} — ${CURRENCY}${(it.qty * it.price).toFixed(2)}`),
      `**Total: ${CURRENCY}${total.toFixed(2)}**`,
      ``,
      `Handled by: ${HANDLED_BY.join(' & ')}`,
      `Sold By ${STORE_NAME}`,
      `Date: ${invoiceRecord.createdAt}`
    ].join('\n');

    // Generate PDF (if PDF_STYLE includes 'both' or 'fancy' etc.)
    let pdfInfo = null;
    try {
      pdfInfo = await generateInvoicePDF({
        invoiceNo,
        buyerTag: invoiceRecord.buyerTag,
        items,
        total
      });
    } catch (e) {
      console.error('PDF creation failed:', e);
    }

    // Send both preview and PDF (if created)
    if (PDF_STYLE === 'both' || PDF_STYLE === 'fancy') {
      if (pdfInfo) {
        // send PDF and chat preview
        await msg.reply({ content: preview, files: [pdfInfo.filepath] });
        // optionally remove file after sending
        try { fs.unlinkSync(pdfInfo.filepath); } catch (e) {}
      } else {
        // PDF failed — send preview only
        await msg.reply({ content: preview });
      }
    } else {
      // style = simple: only chat preview
      await msg.reply({ content: preview });
    }

  } catch (err) {
    console.error('messageCreate error:', err);
    try { msg.reply('❌ Error processing invoice.'); } catch {}
  }
});

// ---------- Start bot ----------
(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();

// ---------- Keep-alive server (for Render Web Service) ----------
const webApp = express();
webApp.get('/', (req, res) => res.send(`${STORE_NAME} Bot is running ✅`));
webApp.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('Web keep-alive server started on port', process.env.PORT || 3000);
});

if (!isAdmin(interaction.member)) {
  return interaction.reply({ content: "❌ Only admins can use this command.", ephemeral: true });
}

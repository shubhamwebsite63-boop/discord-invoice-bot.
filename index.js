import { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from "discord.js";
import fs from "fs";
import PDFDocument from "pdfkit";

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const TOKEN = process.env.TOKEN;
client.login(TOKEN);

// Temporary invoice session store
const sessions = {};

const products = [
    { id: "p1", name: "Burger", price: 120 },
    { id: "p2", name: "Pizza", price: 250 },
    { id: "p3", name: "Momos", price: 80 }
];

client.once(Events.ClientReady, () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {

    // /invoice start
    if (interaction.isChatInputCommand() && interaction.commandName === "invoice") {
        sessions[interaction.user.id] = { items: [], buyer: interaction.user.username };

        const row = new ActionRowBuilder()
            .addComponents(products.map(p =>
                new ButtonBuilder().setCustomId(p.id).setLabel(`${p.name} - ₹${p.price}`).setStyle(ButtonStyle.Primary)
            ));

        return interaction.reply({ content: "🛍 **Select a product:**", components: [row] });
    }

    // Product selection
    if (interaction.isButton()) {
        const session = sessions[interaction.user.id];
        if (!session) return interaction.reply({ content: "Start invoice with `/invoice` first.", ephemeral: true });

        const product = products.find(p => p.id === interaction.customId);
        if (!product) return;

        session.selectedProduct = product;

        return interaction.reply({ content: `Enter quantity for **${product.name}**:` });
    }

    // Quantity input
    if (interaction.isMessage()) return; // ignore messages globally

});

client.on("messageCreate", async message => {
    if (message.author.bot) return;

    const session = sessions[message.author.id];
    if (!session || !session.selectedProduct) return;

    const qty = parseInt(message.content);
    if (isNaN(qty) || qty <= 0) return message.reply("❌ **Enter a valid number.** Try again.");

    session.items.push({ ...session.selectedProduct, qty });
    session.selectedProduct = null;

    await message.reply("✅ Added to invoice. Type `done` if finished or select another product again.");

    // User is done
    if (message.content.toLowerCase() === "done") {
        if (!fs.existsSync("invoices")) fs.mkdirSync("invoices");

        const invoiceId = Date.now();
        const path = `invoices/invoice-${invoiceId}.pdf`;

        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(path));

        doc.fontSize(20).text("Invoice", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Buyer: ${session.buyer}`);
        doc.moveDown();

        let total = 0;
        session.items.forEach(item => {
            const cost = item.qty * item.price;
            total += cost;
            doc.text(`${item.name} x ${item.qty} = ₹${cost}`);
        });

        doc.moveDown();
        doc.fontSize(14).text(`Total: ₹${total}`);
        doc.end();

        delete sessions[message.author.id];

        return message.channel.send({ content: "🧾 **Invoice Generated!**", files: [path] });
    }
});

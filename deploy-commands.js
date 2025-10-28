require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  // Product management
  new SlashCommandBuilder()
    .setName('addproduct')
    .setDescription('Add a product to product list')
    .addStringOption(o => o.setName('name').setDescription('Product name').setRequired(true))
    .addNumberOption(o => o.setName('price').setDescription('Price (number)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removeproduct')
    .setDescription('Remove a product by id or name')
    .addStringOption(o => o.setName('name').setDescription('Product name or id').setRequired(true)),

  new SlashCommandBuilder()
    .setName('listproducts')
    .setDescription('List all products'),

  // Invoice flow
  new SlashCommandBuilder()
    .setName('invoice_start')
    .setDescription('Start an invoice and pick products')
    .addStringOption(o => o.setName('buyer_name').setDescription("Buyer's full name").setRequired(true))
    .addStringOption(o => o.setName('buyer_username').setDescription("Buyer's username (optional)").setRequired(true)),

  new SlashCommandBuilder()
    .setName('invoice_generate')
    .setDescription('Generate the invoice PDF for current session'),

  new SlashCommandBuilder()
    .setName('invoice_reset')
    .setDescription('Reset current invoice session'),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Refreshing application (/) commands...');
    // Use guild commands for instant registration while testing: requires GUILD_ID in env
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
      console.log('✅ Registered guild commands.');
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('✅ Registered global commands (may take up to 1 hour).');
    }
  } catch (err) {
    console.error('Error registering commands:', err);
  }
})();

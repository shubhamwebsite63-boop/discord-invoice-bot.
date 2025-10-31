import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('invoice')
    .setDescription('Start an invoice (select product, qty)'),
  new SlashCommandBuilder()
    .setName('invoice_generate')
    .setDescription('Generate & send the invoice PDF (finalize)'),
  new SlashCommandBuilder()
    .setName('addproduct')
    .setDescription('Add product (admin)')
    .addStringOption(opt => opt.setName('name').setDescription('Product name').setRequired(true))
    .addNumberOption(opt => opt.setName('price').setDescription('Price in $').setRequired(true)),
  new SlashCommandBuilder()
    .setName('listproducts')
    .setDescription('List current products')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Registering commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Commands registered');
  } catch (err) {
    console.error('❌ Error registering commands', err);
  }
})();

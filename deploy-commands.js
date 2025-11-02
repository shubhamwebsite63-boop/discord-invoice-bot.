import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder().setName('invoice').setDescription('Start an invoice'),
  new SlashCommandBuilder().setName('invoice_generate').setDescription('Force-generate invoice (not usually needed)'),
  new SlashCommandBuilder().setName('listproducts').setDescription('List products'),
  new SlashCommandBuilder()
    .setName('addproduct')
    .setDescription('Add product (admin)')
    .addStringOption(o => o.setName('name').setDescription('Product name').setRequired(true))
    .addNumberOption(o => o.setName('price').setDescription('Price (INR)').setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Commands registered ✅');
  } catch (err) {
    console.error('Failed registering commands:', err);
  }
})();

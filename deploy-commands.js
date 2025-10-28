require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('buyer')
    .setDescription('Set buyer info')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Buyer Name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Buyer Username')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Add an item to invoice')
    .addStringOption(option =>
      option.setName('product')
        .setDescription('Product Name')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Quantity')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('Price')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Generate final invoice PDF'),

  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Clear current invoice session'),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('🚀 Refreshing slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('✅ Slash commands updated successfully.');
  } catch (error) {
    console.error('❌ Error updating commands:', error);
  }
})();

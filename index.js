import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
const products = require("./products.json");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const { Client, GatewayIntentBits } = require("discord.js");
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Handle menu + buttons
client.on("interactionCreate", async interaction => {

  // Slash command trigger
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "invoice") {

      const productMenu = new StringSelectMenuBuilder()
        .setCustomId("product_select")
        .setPlaceholder("Choose a product")
        .addOptions(products.map(p => ({
          label: p.name,
          description: `₹${p.price}`,
          value: p.name
        })));

      await interaction.reply({
        content: "**Select a product and adjust quantity:**",
        components: [new ActionRowBuilder().addComponents(productMenu)]
      });
    }
  }

  // Product selected
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "product_select") {
      const selected = products.find(p => p.name === interaction.values[0]);
      let quantity = 1;

      const updateEmbed = () =>
        new EmbedBuilder()
          .setTitle("🧾 Invoice Builder")
          .addFields(
            { name: "Product", value: selected.name, inline: true },
            { name: "Price Each", value: `₹${selected.price}`, inline: true },
            { name: "Quantity", value: `${quantity}`, inline: true },
            { name: "Total", value: `**₹${selected.price * quantity}**` }
          )
          .setColor("#00A3FF");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("minus").setLabel("-").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("plus").setLabel("+").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("confirm").setLabel("✅ Confirm").setStyle(ButtonStyle.Success)
      );

      await interaction.update({ embeds: [updateEmbed()], components: [row] });

      client.on("interactionCreate", async btn => {
        if (!btn.isButton()) return;

        if (btn.customId === "minus" && quantity > 1) quantity--;
        if (btn.customId === "plus") quantity++;

        if (btn.customId === "confirm") {
          return btn.update({
            embeds: [updateEmbed()],
            components: [],
            content: `✅ **Invoice Confirmed!**\nUse next step to generate final invoice later.`
          });
        }

        btn.update({ embeds: [updateEmbed()], components: [row] });
      });
    }
  }
});

client.login(process.env.TOKEN);


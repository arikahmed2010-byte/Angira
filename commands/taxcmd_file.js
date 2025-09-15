const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tax')
    .setDescription('Calculate tax for a given amount.')
    .addSubcommand(sub =>
      sub
        .setName('calculate')
        .setDescription('Calculates the tax for the given amount.')
        .addNumberOption(option =>
          option.setName('amount')
            .setDescription('Enter the amount to calculate tax for')
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'calculate') {
      await interaction.deferReply({ ephemeral: true });
      const amount = interaction.options.getNumber('amount');
      const taxRate = 0.3; // 30%
      const tax = amount * taxRate;
      const total = amount + tax;

      await interaction.editReply({
        content: `🧾 **Tax Calculation**\n• Original Amount: ₹${amount.toFixed(2)}\n• Tax (30%): ₹${tax.toFixed(2)}\n• Total with Tax: ₹${total.toFixed(2)}`
      });
    }
  }
};
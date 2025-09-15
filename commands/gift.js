
const { SlashCommandBuilder } = require('discord.js');


module.exports = {
  data: new SlashCommandBuilder()
          .setName('gift')
          .setDescription('Sends a specified amount of virtual currency or reputation points to another user.')
          .addUserOption(option =>
            option.setName('user')
              .setDescription('The user to give reputation points to')
              .setRequired(true)
          )
          .addNumberOption(option =>
            option.setName('amount')
              .setDescription('Amount of reputation points to give')
              .setRequired(true)
          ),
  
  async execute(interaction) {
      
        const user = interaction.options.getUser('user');

        let points = interaction.options.getNumber('amount');

        await interaction.reply({ content: `Yipee! <@${interaction.user.id}> has given <@${user.id}> ${points} reputation points!` });
        
  }
};

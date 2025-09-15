
const { SlashCommandBuilder } = require('discord.js');

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function comment_msg(points) {
  
  if (points < 20 && points >= 0) {
    return "You should work on yourself...";
  } else if (points < 40 && points > 20) {
    return "You are doing ok...";
  } else if (points < 60 && points > 40) {
    return "That's an average amount of reputation points!";
  } else if (points < 80 && points > 60) {
    return "That's an insane amount of reputation points!";
  } else if (points <= 100 && points > 80) {
    return "That's an insane amount of reputation points! You are a legend!";

  }
}

module.exports = {
  data: new SlashCommandBuilder()
          .setName('reputation')
          .setDescription('Gives reputation points to a user (can be tracked for a fun, gamified system).')
          .addUserOption(option =>
            option.setName('user')
              .setDescription('The user to give reputation points to')
              .setRequired(true)
          ),
  
  async execute(interaction) {
        
        await interaction.deferReply({});

        const user = interaction.options.getUser('user');

        let points = getRandomInt(1, 100);

        await interaction.editReply({ content: `You have given ${user} ${points} reputation points! <@${user.id}>, ${comment_msg(points)}` });

  }
};

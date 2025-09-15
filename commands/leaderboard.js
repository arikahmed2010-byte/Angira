
const { SlashCommandBuilder, EmbedBuilder, Colors} = require('discord.js');
const {MongoClient, Long} = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
          .setName('leaderboard')
          .setDescription('Displays a leaderboard of users with the highest levels or XP.'),
  
  async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const client = new MongoClient(process.env.MONGO_URI);

        await client.connect();

        const db = client.db("Angira");
    
        const config_collection = db.collection("Configuration");

        const config = await config_collection.findOne( {"server_id": new Long(interaction.guild.id)} );
    
        if (!config) {
            await interaction.editReply({ content: "No configuration found for this guild." });
            return;
        }

        const level_collection = db.collection("Level");

        const result = await level_collection.aggregate([
            { $match: { server_id: new Long(interaction.guild.id) } },
            { $sort: { xp: 1 } },
            { $limit: 10 }
          ]).toArray();

        if (result.length === 0) {
            await interaction.editReply({ content: "No users found in the leaderboard." });
            return;
        }

        let leaderboard = "Leaderboard:\n";
        result.forEach((user, index) => {
            leaderboard += `${index + 1}. <@${user.user_id}> - Level: ${user.level}, XP: ${user.xp}\n`;
        });

        const embed = new EmbedBuilder()
           .setTitle("Top ten users with the most levels")
           .setDescription(leaderboard)
           .setTimestamp()
           .setColor(Colors.DarkBlue)
           .setFooter(
               {text: `Action ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png'}
           );
        
        await interaction.editReply({ embeds: [embed] });

  }
};

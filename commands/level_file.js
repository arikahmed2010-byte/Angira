const { SlashCommandBuilder, EmbedBuilder, Colors} = require('discord.js');
const {MongoClient, Long} = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
          .setName('level')
          .setDescription('Shows your current XP and level.'),
  
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

      const level = await level_collection.findOne({ "server_id": new Long(interaction.guild.id), "user_id": new Long(interaction.user.id) });
      
      if (!level) {
          const embed = new EmbedBuilder()
                   .setTitle("Your stats")
                   .setDescription("Level: 0\nXP: 0")
                   .setTimestamp()
                   .setColor(Colors.DarkBlue)
                   .setFooter(
                       {text: `Action ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png'}
                   );
          await interaction.editReply({ embeds: [embed] });
          return;
      }
      const embed = new EmbedBuilder()
                   .setTitle("Your stats")
                   .setDescription(`Level: ${level.level}\nXP: ${level.xp}/${level.level * 10}`)
                   .setTimestamp()
                   .setColor(Colors.DarkBlue)
                   .setFooter(
                       {text: `Action ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png'}
                   );
      await interaction.editReply({ embeds: [embed] });
      return;
  }
};
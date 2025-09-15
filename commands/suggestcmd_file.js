const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const MongoDB = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
            .setName('suggest')
            .setDescription('Give a suggestion to the community staff.'),
    
  async execute(interaction) {

      const client = new MongoClient(process.env.MONGO_URI);
            
      await client.connect();
        
      const db = client.db("Angira");
  
      const config_collection = db.collection("Configuration");
    
      const config = await config_collection.findOne( {"server_id": new MongoDB.Long(interaction.guild.id)} );
  
      if (!config) {
          await interaction.editReply({ content: "No configuration found for this guild." });
          return;
      }

      const modal = new ModalBuilder()
                  .setCustomId("suggestion_modal")
                  .setTitle("Suggestion modal");

      const suggestInput = new TextInputBuilder()
        .setCustomId("suggestion")
        .setLabel("What's your suggestion?")
        .setStyle(TextInputStyle.Paragraph);
      
      const ActionRow = new ActionRowBuilder().addComponents(suggestInput);

      modal.addComponents(ActionRow);

      await interaction.showModal(modal);
  }
};
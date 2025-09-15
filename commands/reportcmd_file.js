const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const MongoDB = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
          .setName('report')
          .setDescription('Report a user for misconduct.')
          .addUserOption(option =>
            option.setName('user')
              .setDescription('The user to report')
              .setRequired(true)
          ),
  
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
                  .setCustomId(`report-${interaction.user.id}`)
                  .setTitle("Report modal");

      const reportInput = new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("What's the reason for reporting?")
        .setPlaceholder("Please provide a detailed reason for the report.")
        .setStyle(TextInputStyle.Paragraph);
      
      const ActionRow = new ActionRowBuilder().addComponents(reportInput);
      
      modal.addComponents(ActionRow);

      await interaction.showModal(modal);
  }
};


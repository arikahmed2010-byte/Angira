const { SlashCommandBuilder } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const {Long} = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
            .setName('leave')
            .setDescription('Sets a custom message for when users leave the server.')
            .addSubcommand(command => 
                command
                  .setName('message')
                  .setDescription('Sets a custom message for when users leave the server.')
                  .addStringOption(option =>
                    option.setName('message')
                      .setDescription('The leave message to set. Use {user} to mention the new member.')
                      .setRequired(true)
                  )
            ),
    
  async execute(interaction) {

      if (interaction.options.getSubcommand() === 'toggle') {
          await interaction.deferReply({ ephemeral: true });

          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
              await interaction.editReply({ content: "You do not have permission to use this command." });
              return;
          }

          const welcomeMessage = interaction.options.getString('message');

          const client = new MongoClient(process.env.MONGO_URI);
          await client.connect();
          
          const db = client.db("Angira");
          const config_collection = db.collection("Configuration");

          const config = await config_collection.findOne({ "server_id": new Long(interaction.guild.id) });

          if (!config) {
              await interaction.editReply({ content: "No configuration found for this guild." });
              return;
          }

          // Update or insert the welcome message
          await config_collection.updateOne(
              { "server_id": new Long(interaction.guild.id) },
              { $set: { "configuration.leave_message": welcomeMessage } },
              { upsert: true }
          );

          await interaction.editReply({
              content: `✅ Leave message has been set to: "${welcomeMessage.replace('{user}', '<@!{user}>')}"`,
          });
      }
  }
};
const { SlashCommandBuilder } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const {Long} = require('mongodb');

const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
            .setName('welcome')
            .setDescription('Toggles the automatic welcome message for new members.')
            .addSubcommand(command => 
                command
                  .setName('toggle')
                  .setDescription('Toggles the automatic welcome message for new members.')
                  .addStringOption(option =>
                    option.setName('message')
                      .setDescription('The welcome message to set. Use {user} to mention the new member.')
                      .setRequired(true)
                  )
            ),
    
  async execute(interaction) {

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

        await config_collection.updateOne(
            { "server_id": new Long(interaction.guild.id) },
            { $set: { "configuration.welcome_message": welcomeMessage.replace('{user}', '<@!{user}>') } },
            { upsert: true }
        );

        await interaction.editReply({
            content: `✅ Welcome message has been set to: "${welcomeMessage.replace('{user}', '`{user}`')}"`,
        });
  }
};
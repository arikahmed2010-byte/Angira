const { SlashCommandBuilder } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const {Long} = require('mongodb');

const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
            .setName('custommsg')
            .setDescription('Sets a custom welcome or goodbye message for users joining or leaving the server.')
            .addSubcommand(command => 
                command
                  .setName('set')
                  .setDescription('Sets a custom welcome or goodbye message for users joining or leaving the server.')
                  .addStringOption(option =>
                    option.setName('message')
                      .setDescription('The welcome/leave message to set. Use {user} to mention the member.')
                      .setRequired(true)
                  )
                  .addStringOption(option =>
                    option.setName('type')
                      .setDescription('Type of message to set (welcome/leave).')
                      .setRequired(true)
                      .addChoices(
                        { name: 'Welcome', value: 'welcome' },
                        { name: 'Leave', value: 'leave' }
                      )
                  )
            ),
    
  async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: "You do not have permission to use this command." });
            return;
        }
        
        const msg = interaction.options.getString('message');
        const type = interaction.options.getString('type');
        const client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        
        const db = client.db("Angira");
        const config_collection = db.collection("Configuration");
        const config = await config_collection.findOne({ "server_id": new Long(interaction.guild.id) });
        
        if (!config) {
            await interaction.editReply({ content: "No configuration found for this guild." });
            return;
        }

        let Field = "";

        if (type === 'welcome') {
            await config_collection.updateOne(
              { "server_id": new Long(interaction.guild.id) },
              { $set: { "configuration.welcome_message": msg } },
              { upsert: true }
            );
        } else if (type === 'leave') {
            await config_collection.updateOne(
              { "server_id": new Long(interaction.guild.id) },
              { $set: { "configuration.leave_message": msg } },
              { upsert: true }
            );
        }

        await interaction.editReply({
            content: `✅ ${type === 'welcome' ? 'Welcome' : 'Leave'} message has been set to: "${msg.replace('{user}', '<@!{user}>')}"`,
        });

  }
};
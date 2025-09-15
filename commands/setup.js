
const { SlashCommandBuilder, EmbedBuilder, Colors, ChannelSelectMenuBuilder, ChannelType, ActionRowBuilder, PermissionsBitField} = require('discord.js');
const {MongoClient, Long} = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
          .setName('setup')
          .setDescription('Starts the auto-server setup wizard.'),
  
  async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: "You do not have permission to use this command." });
            return;
        }
        const client = new MongoClient(process.env.MONGO_URI);

        await client.connect();

        const db = client.db("Angira");
    
        const config_collection = db.collection("Configuration");

        let config = await config_collection.findOne( {"server_id": new Long(interaction.guild.id)} );
    
        if (!config) {
            await interaction.editReply({ content: "No configuration found for this server. Starting setup..." });

            config = {
                "server_id": new Long(interaction.guild.id),
                "configuration": {
                    logs_channel: null,
                    mute_role: null,
                    ticket_category: null,
                    ticket_viewroles: [  ],
                    moderation_roles: [  ],
                    report_channel: null,
                    suggestion_channel: null,
                    leveling_channel: null
                }
            }
            await config_collection.insertOne(config);

        }

        const embed = new EmbedBuilder()
            .setTitle("Server Setup Wizard")
            .setDescription("**Step 1:** Please provide the ID of the channel where you want to log events (e.g., moderation actions).")
            .setColor(Colors.Blue);
        
        const selectMenu = new ChannelSelectMenuBuilder({
            custom_id: `LogsChannelSelect-${interaction.guild.id}`,
            placeholder: 'Select a channel for logs',
            min_values: 1,
            max_values: 1
        })
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
        
        await interaction.editReply({ content: "", embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] }); 
  }
};

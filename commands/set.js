const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const {MongoClient, Long} = require('mongodb');
const dotenv = require('dotenv'); 
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
          .setName('set')
          .setDescription('Use for setting up various configurations for the server.')
          .addSubcommand(subcommand =>
            subcommand
              .setName('channel')
              .setDescription('Set a channel for events like logs, reports, etc.')
              .addStringOption(option =>
                option.setName('type')
                  .setDescription('Type of channel to set (logs, reports, etc.)')
                  .setRequired(true)
                  .addChoices(
                    { name: 'Logs', value: 'logs' },
                    { name: 'Reports', value: 'reports' },
                    { name: 'Suggestions', value: 'suggestions' },
                    { name: 'Tickets', value: 'tickets' }
                  )
              )
              .addChannelOption(option =>
                option.setName('channel')
                  .setDescription('The channel to set for the specified type')
                  .setRequired(true)
              )
          )
          .addSubcommand(subcommand =>
            subcommand
              .setName('role')
              .setDescription('Set a role for events like viewing tickets, moderating, etc.')
              .addStringOption(option =>
                option.setName('type')
                  .setDescription('Type of roles to set (ticket viewers, moderators, etc.)')
                  .setRequired(true)
                  .addChoices(
                    { name: 'Moderation', value: 'moderation' },
                    { name: 'Ticket Viewer', value: 'TW' }
                  )
              )
              .addRoleOption(option =>
                option.setName('role')
                  .setDescription('The role to set for the specified type')
                  .setRequired(true)
              )
          ),
  
  async execute(interaction) {
        
        await interaction.deferReply({'ephemeral': true});

        const client = new MongoClient(process.env.MONGO_URI);
        
        await client.connect();

        const db = client.db("Angira");
    
        const config_collection = db.collection("Configuration");

        const config = await config_collection.findOne( {"server_id": new Long(interaction.guild.id)} );

        let hasMOD = false
        
        for (const roleId of config_collection.configuration.mod_roles) {
          const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
          if ((role && interaction.member.roles.cache.has(role.id))) {
              hasMOD = true
          }
        }

        if (!(hasMOD)) {
            await interaction.editReply({ content: "You do not have permission to use this command." });
            return;
        }

        
        if (!config) {
            await interaction.editReply({ content: "No configuration found for this server. Please run the setup command first." });
            return;
        }

        if (interaction.options.getSubcommand() === 'channel') {
            const type = interaction.options.getString('type');
            const channel = interaction.options.getChannel('channel');

            if (type == 'logs') {
                config_collection.updateOne(
                    { "server_id": new Long(interaction.guild.id) },
                    { $set: { "configuration.logs_channel": channel.id } }
                );
            }
            else if (type == 'reports') {
                config_collection.updateOne(
                    { "server_id": new Long(interaction.guild.id) },
                    { $set: { "configuration.report_channel": channel.id } }
                );
            }
            else if (type == 'suggestions') {
                config_collection.updateOne(
                    { "server_id": new Long(interaction.guild.id) },
                    { $set: { "configuration.suggestion_channel": channel.id } }
                );
            }
            else if (type == 'tickets') {
                config_collection.updateOne(
                    { "server_id": new Long(interaction.guild.id) },
                    { $set: { "configuration.ticket_category": channel.id } }
                );
            }
            
            await interaction.editReply({ content: `Channel for ${type} has been set to ${channel.name}.` });
        }

        if (interaction.options.getSubcommand() === 'role') {
            const type = interaction.options.getString('type');
            const role = interaction.options.getRole('role');

            if (type == 'moderation') {
                let config_set = config.configuration.moderation_roles || [];
                config_set.push(role.id);
                config_collection.updateOne(
                    { "server_id": new Long(interaction.guild.id) },
                    { $set: { "configuration.moderation_roles": config_set } }
                );
            }
            else if (type == 'TW') {
                let config_set = config.configuration.ticket_viewroles || [];
                config_set.push(role.id);
                config_collection.updateOne(
                    { "server_id": new Long(interaction.guild.id) },
                    { $set: { "configuration.ticket_viewroles": config_set } }
                );
            }
            
            await interaction.editReply({ content: `Channel for ${type} has been set to ${role.name}.` });
        }
        
  }
};
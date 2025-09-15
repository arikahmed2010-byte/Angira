const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const os = require('os');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const { Collection } = require('discord.js');
const config_data = require('../config.json');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
        .setName('bot')
        .setDescription('Use for obtaining information about the bot.')
        .addSubcommand(subcommand =>
          subcommand
            .setName('status')
            .setDescription("Displays the bot's uptime, status, and performance (e.g., response time, server load).")
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('update')
            .setDescription("Checks for available updates to the bot and applies them.")
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('restart')
            .setDescription("Restarts the bot (admin only).")
        ),
  
    async execute(interaction) {

        await interaction.deferReply({ephemeral: true});

        if (interaction.options.getSubcommand() === 'status') {
            const embed = new EmbedBuilder()
            .setTitle("Bot Status")
            .setDescription(`**Uptime:** ${Math.floor(process.uptime() / 60)} minutes\n` +
                            `**Memory Usage:** ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
                            `**CPU Load:** ${(os.loadavg()[0] * 100).toFixed(2)}%\n` +
                            `**Response Time:** ${Math.round(interaction.client.ws.ping)} ms`)
            .setColor(Colors.Blurple)
            .setTimestamp();
        
            await interaction.editReply({ embeds: [embed] });
        }

        if (interaction.options.getSubcommand() === 'update') {

            const client = interaction.client;

            client.commands = new Collection();

            let cmds = [];

            const folderPath = __dirname

            const jsFiles = fs.readdirSync(folderPath)
              .filter(file => file.endsWith('.js'));

            for (const file of jsFiles) {
              const filePath = path.join(folderPath, file);
              const command = require(filePath);
              client.commands.set(command.data.name, command)
              cmds.push(command.data.toJSON());
            }

            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
            (async () => {
              try {
                console.log('Registering slash commands...');
                await rest.put(
                  Routes.applicationCommands(process.env.CLIENT_ID),
                  { body: cmds },
                );
                console.log('Commands registered successfully.');
              } catch (error) {
                console.error(error);
              }
            })();

            const embed = new EmbedBuilder()
                .setTitle("Update Information")
                .setDescription(`**Commands Updated:** ${cmds.length}\n`)
                .setColor(Colors.Blurple)
                .setTimestamp();
        
            await interaction.editReply({ embeds: [embed] });
        }

        if (interaction.options.getSubcommand() === 'restart') {
            for (let id of config_data.Admins) {
              if (id === interaction.user.id) {
                const embed = new EmbedBuilder()
                  .setTitle("Bot Restarting")
                  .setDescription("The bot is restarting now. Please wait a moment.")
                  .setColor(Colors.Blurple)
                  .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

                axios.post(`https://api.render.com/v1/services/${config_data.ServiceID}/restart`, Headers= {
                  "accept": "application/json",
                  "authorization": `Bearer ${process.env.RENDER_TOKEN}`
                })
                .catch(function (error) {
                  console.log(error);
                });
                
                return;
              }
            }
            await interaction.editReply({ content: "You do not have permission to restart the bot." });
        }
    }
};
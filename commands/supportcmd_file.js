const { SlashCommandBuilder, ChannelType, PermissionsBitField, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const MongoDB = require('mongodb');
const { Long } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Contact the community staffs.')
    .addSubcommand(sub =>
      sub
        .setName('open')
        .setDescription('Opens a new support ticket.')
        .addStringOption(option =>
          option.setName('subject')
            .setDescription('Reason for opening the ticket.')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
        sub
          .setName('close')
          .setDescription('Closes the current support ticket.')
    )
    .addSubcommand(sub =>
        sub
          .setName('add')
          .setDescription('Adds a user to the current support ticket.')
          .addUserOption(option =>
            option.setName('user')
                .setDescription('User to add to the ticket.')
                .setRequired(true)
          )
    )
    .addSubcommand(sub =>
        sub
          .setName('closerequest')
          .setDescription('Sends a close request.')
    )
    .addSubcommand(sub =>
        sub
          .setName('remove')
          .setDescription('Removes a user from the current support ticket.')
          .addUserOption(option =>
            option.setName('user')
                .setDescription('User to add to the ticket.')
                .setRequired(true)
          )
    ),

  async execute(interaction) {


    const client = new MongoClient(process.env.MONGO_URI);
      
    await client.connect();
      
    const db = client.db("Angira");

    const config_collection = db.collection("Configuration");

    const ticket_collection = db.collection("Ticket");

    const config = await config_collection.findOne( {"server_id": new MongoDB.Long(interaction.guild.id)} );

    if (!config) {
        await interaction.editReply({ content: "No configuration found for this guild." });
        return;
    }
    if (interaction.options.getSubcommand() === 'open') {

        await interaction.deferReply({ ephemeral: true });

        const subject = interaction.options.getString('subject');

        const ticket_exists = await ticket_collection.findOne({ "server_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(interaction.user.id) })

        if (ticket_exists) {
            await interaction.editReply({
              content: "You already made a ticket! Please use `/ticket close` to delete your ticket!",
              ephemeral: true
            })
            return;
        }

        let perms = [
          {type: 'member', id: interaction.user.id, allow: [ PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory ]},
          {type: 'role', id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
        
        config.configuration.ticket_viewroles.forEach(role_id => {
            perms.push({type: 'role', id: role_id.toString(), allow: [ PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory ]})
        });

        try {
          let channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.id}`,
            type: ChannelType.GuildText,
            parent: config.configuration.ticket_category.toString(),
            permissionOverwrites: perms
          });

          const embed = new EmbedBuilder()
                  .setTitle(`Ticket: ${interaction.id}`)
                  .setDescription(`Reason of opening ticket: ${subject}`)
                  .setTimestamp()
                  .setColor(Colors.DarkBlue)
                  .setFooter(
                      {text: `Ticket ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png'}
                  );

          await ticket_collection.insertOne({ "_id": new MongoDB.Long(interaction.id), "server_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(interaction.user.id), "channel_id": new MongoDB.Long(channel.id) })

          await channel.send({
            embeds: [embed]
          });

          await interaction.editReply( {
            content: `A new ticket has been made! (Ticket: <#${channel.id}>)`
          } );
        } catch (error) {
          await interaction.editReply({
            content: `Failed to create ticket channel! Error: ${error}`,
            ephemeral: true
          })
          return;
        }
    } else if (interaction.options.getSubcommand() === 'close') {
      await interaction.deferReply({ ephemeral: true });

      const ticket_card = await ticket_collection.findOne({ "server_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(interaction.user.id) })

      if (!ticket_card) {
          await interaction.editReply({ content: "You haven't even created a ticket yet! Use `/ticket open` to create one!"})
          return;
      }

      const ticket_channel = interaction.guild.channels.cache.get(ticket_card.channel_id.toString());

      await ticket_collection.deleteOne({"server_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(interaction.user.id) })

      if (ticket_channel) {
          ticket_channel.delete()
      }

      await interaction.editReply({ content: `Successfully closed \`ticket-${ticket_card._id.toString()}\``})

    } else if (interaction.options.getSubcommand() === 'add') {
        await interaction.deferReply({ ephemeral: true });

        const user = interaction.options.getUser("user");
        
        const ticket_card = await ticket_collection.findOne({ "server_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(interaction.user.id) })

        if (!ticket_card) {
          await interaction.editReply({ content: "You haven't even created a ticket yet! Use `/ticket open` to create one!"})
          return;
        }

        const ticket_channel = interaction.guild.channels.cache.get(ticket_card.channel_id.toString());

        if (!ticket_channel) {
          await ticket_collection.deleteOne({ "server_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(interaction.user.id)})
          await interaction.editReply({ content: "The ticket channel has been deleted! Use `/ticket open` to create a new one!"})
          return;
        }

        try {
          await ticket_channel.permissionOverwrites.edit(user.id, {
            ViewChannel: true,
            ManageChannels: true,
            AttachFiles: true,
            ReadMessageHistory: true,
          });
          await interaction.editReply({content: `Added <@${user.id}> to the ticket!`})
        } catch(err) {
          await interaction.editReply({content: `There was an error! Err: ${err}`})
        }

    } else if (interaction.options.getSubcommand() === 'remove') {
      await interaction.deferReply({ ephemeral: true });

      const user = interaction.options.getUser("user")
      
      const ticket_card = await ticket_collection.findOne({ "server_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(interaction.user.id) })

      if (!ticket_card) {
        await interaction.editReply({ content: "You haven't even created a ticket yet! Use `/ticket open` to create one!"})
        return;
      }

      const ticket_channel = interaction.guild.channels.cache.get(ticket_card.channel_id.toString());

      if (!ticket_channel) {
        await ticket_collection.deleteOne({ "server_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(interaction.user.id)})
        await interaction.editReply({ content: "The ticket channel has been deleted! Use `/ticket open` to create a new one!"})
        return;
      }

      try {
        await ticket_channel.permissionOverwrites.edit(user.id, {
            ViewChannel: false,
            ManageChannels: false,
            AttachFiles: false,
            ReadMessageHistory: false,
          });
        await interaction.editReply({content: `Removed <@${user.id}> from the ticket!`})
      } catch(err) {
        await interaction.editReply({content: `There was an error! Err: ${err}`})
      }

    } else if (interaction.options.getSubcommand() === 'closerequest') {
      await interaction.deferReply();

      const channel_id = interaction.channel.id;

      const ticket_card = await ticket_collection.findOne({ "server_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(interaction.user.id)})

      if (!ticket_card) {
        await interaction.editReply({content: "You haven't even created a ticket yet!"})
        return;
      }

      if (ticket_card.channel_id != channel_id) {
        await interaction.editReply({content: "You have to use this command in the ticket channel!"})
        return;
      }

      const user = await interaction.client.users.fetch(ticket_card.user_id.toString())

      const confirm = new ButtonBuilder()
			    .setCustomId(`confirm-${user.id}`)
			    .setLabel('Close ticket')
			    .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒');

      const ActionRow = new ActionRowBuilder().addComponents([confirm])

      await interaction.editReply({
        content: `<@${user.id}>, would you like to close the ticket?`,
        components: [ActionRow]
      })
    }
  }
};
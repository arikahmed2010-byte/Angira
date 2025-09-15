const { Client, SlashCommandBuilder, EmbedBuilder, GatewayIntentBits, Colors } = require('discord.js');
const MongoDB = require('mongodb');
const MongoClient = MongoDB.MongoClient;
const dotenv = require('dotenv');
dotenv.config();

const discord_client = new Client({ intents: [GatewayIntentBits.Guilds] });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('A set of commands relating to moderation!')
    .addSubcommand(sub =>
      sub
        .setName('ban')
        .setDescription('Bans a user from the server.')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Enter the user to ban.')
            .setRequired(true)
        
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Enter the reason for banning the user.')
            .setRequired(false)
        )
        .addNumberOption(option =>
            option.setName('duration')
              .setDescription('Enter the duration of the ban, not setting this value will permanently ban the user.')
              .setRequired(false)
          )
    )
    .addSubcommand(sub =>
        sub
          .setName('kick')
          .setDescription('Kicks a user from the server.')
          .addUserOption(option =>
            option.setName('user')
              .setDescription('Enter the user to kick.')
              .setRequired(true)
          
          )
          .addStringOption(option =>
            option.setName('reason')
              .setDescription('Enter the reason for kicking the user.')
              .setRequired(false)
          )
      )
    .addSubcommand(sub =>
      sub
        .setName('warn')
        .setDescription('Warns a user from the server.')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Enter the user to warn.')
            .setRequired(true)
        
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Enter the reason for warning the user.')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('mute')
        .setDescription('Mutes a user from the server.')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Enter the user to mute.')
            .setRequired(true)
        
        )
        .addNumberOption(option =>
          option.setName('duration')
            .setDescription('Enter the duration of the mute, not specifiying it will permanently mute the user.')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
        sub
          .setName('unmute')
          .setDescription('Unmutes a user from the server.')
          .addUserOption(option =>
            option.setName('user')
              .setDescription('Enter the user to unmute.')
              .setRequired(true)
          
          )
      )
    .addSubcommand(sub =>
        sub
          .setName('lock')
          .setDescription('Locks a channel for specific roles.')
      )
    .addSubcommand(sub =>
        sub
          .setName('unlock')
          .setDescription('Unlocks a channel for specific roles.')
      )
    .addSubcommand(sub =>
        sub
          .setName('slowmode')
          .setDescription('Sets slowmode on a channel to control message spam.')
          .addNumberOption(option =>
            option.setName('seconds')
              .setDescription('Sets the slowmode rate.')
              .setRequired(true)
          )
      )
    .addSubcommand(sub =>
      sub
        .setName('clear')
        .setDescription('Removes a certain amount of messages from a channel.')
        .addNumberOption(option =>
          option.setName('amount')
            .setDescription('Enter the amount of messages to remove.')
            .setRequired(true)
        )
    ),
  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });
    
    const mClient = new MongoClient(process.env.MONGO_URI);
    
    await mClient.connect();

    const datab = mClient.db("Angira");
    const config_collection = datab.collection("Configuration");

    const c = await config_collection.findOne( {"server_id": new MongoDB.Long(interaction.guild.id)} );

    if (!c) {
        await interaction.editReply({ content: "No configuration found for this guild." });
        return;
    }

    if (c.configuration.moderation_roles === null) {
        await interaction.editReply({ content: "No mod roles found for this guild." });
        return;
    }

    let hasMOD = false
        
    for (const roleId of c.configuration.moderation_roles) {
      const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
      if ((role && interaction.member.roles.cache.has(role.id))) {
          hasMOD = true
      }
    }

    if (!(hasMOD)) {
        await interaction.editReply({ content: "You do not have permission to use this command." });
        return;
    }

    if (interaction.options.getSubcommand() === 'ban') {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const duration = interaction.options.getNumber('duration') || 0;

        if (user.id === interaction.user.id) {
          return interaction.reply({ content: "You can't ban yourself.", ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(user.id);

        if (!member.bannable) {
          return interaction.reply({ content: "I can't ban this user. Check my permissions or role hierarchy.", ephemeral: true });
        }

        try {
          await user.send({
            content: `You have been banned from **${interaction.guild.name}**.\nReason: ${reason}\nDuration: ${duration}`
          });
        } catch (err) {
          console.warn("Couldn't DM user:", err.message);
        }

        await member.ban({ reason });

        const client = new MongoClient(process.env.MONGO_URI);
        
        const db = client.db("Angira");

        db.collection("Configuration").findOne( {"server_id": new MongoDB.Long(interaction.guild.id)}, function(res, err) {
            if (err) {
                interaction.editReply({content: `Failed to fetch configuration data! Error: ${err}`})
                return;
            }

            const embed = new EmbedBuilder()
                    .setTitle("A new moderation action!")
                    .setDescription("A new moderation action has been taken!")
                    .addFields(
                        { name: 'Action type:', value: 'Ban' },
                        { name: "Moderator:", value: `<@${interaction.user.id}>`, inline: true},
                        { name: 'Target:', value: `<@${user.id}>`, inline: true },
                        { name: 'Reason:', value: reason, inline: false }
                    )
                    .setTimestamp()
                    .setColor(Colors.DarkBlue)
                    .setFooter(
                        {text: `Action ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png'}
                    );

            discord_client.channels.fetch(res.configuration.logs_channel).then(channel => {
                channel.send( {embeds: [embed] });
            }).catch(error => {
                console.log(err);
            });
        })

        await interaction.editReply({
          content: `✅ Successfully banned <@${user.id}>.`,
          ephemeral: true
        });
    } if (interaction.options.getSubcommand() === 'warn') {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (user.id === interaction.user.id) {
          return interaction.reply({ content: "You can't warn yourself.", ephemeral: true });
        }

        try {
          await user.send({
            content: `You have been warned from **${interaction.guild.name}**.\nReason: ${reason}`
          });
        } catch (err) {
          console.warn("Couldn't DM user:", err.message);
        }

        const client = new MongoClient(process.env.MONGO_URI);
        
        await client.connect();

        const db = client.db("Angira")

        const exists = await db.collection("Warning").findOne({"_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(user.id)})

        if (!exists) {
            await db.collection("Warning").insertOne({"_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(user.id), "guild_id": interaction.guild.id, "type": "normal", "warnings": new MongoDB.Long(1)});
        } else {
            await db.collection("Warning").updateOne({"_id": new MongoDB.Long(interaction.guild.id), "user_id": new MongoDB.Long(user.id), "guild_id": interaction.guild.id, "type": "normal"}, {"$inc": {"warnings": new MongoDB.Long(1)}});
        }
        if (warn_collection.findOne({ userId: user.id, guildId: interaction.guild.id, type: "staff" }).warnings >= 3) {
            const member = await interaction.guild.members.fetch(user.id);
            await member.kick({ reason: "Exceeded warning limit" });
        }
        const config = await db.collection("Configuration").findOne({"server_id": new MongoDB.Long(interaction.guild.id)});

        const embed = new EmbedBuilder()
                    .setTitle("A new moderation action!")
                    .setDescription("A new moderation action has been taken!")
                    .addFields(
                        { name: 'Action type:', value: 'Warn' },
                        { name: "Moderator:", value: `<@${interaction.user.id}>`, inline: true},
                        { name: 'Target:', value: `<@${user.id}>`, inline: true },
                        { name: 'Reason:', value: reason, inline: false }
                    )
                    .setTimestamp()
                    .setColor(Colors.DarkBlue)
                    .setFooter(
                        {text: `Action ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png'}
                    );

        await interaction.client.channels.fetch(config.configuration.logs_channel.toString()).then(channel => {
            channel.send( {embeds: [embed] });
        }).catch(error => {
            console.log(error);
        });

        await interaction.editReply({
          content: `✅ Successfully warned <@${user.id}>.`,
          ephemeral: true
        });
    } else if (interaction.options.getSubcommand() === 'kick') {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (user.id === interaction.user.id) {
          return interaction.reply({ content: "You can't kick yourself.", ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
          return interaction.reply({ content: "User not found in this server.", ephemeral: true });
        }

        if (!member.kickable) {
          return interaction.reply({ content: "I can't kick this user. Check my permissions or role hierarchy.", ephemeral: true });
        }

        try {
          await user.send({
            content: `You have been kicked from **${interaction.guild.name}**.\nReason: ${reason}\nDuration: ${duration}`
          });
        } catch (err) {
          console.warn("Couldn't DM user:", err.message);
        }

        await member.kick({ reason });

        const client = new MongoClient(process.env.MONGO_URI);
        
        const db = client.db("Angira");

        await client.connect();
        
        db.collection("Configuration").findOne( {"server_id": new MongoDB.Long(interaction.guild.id)}, function(res, err) {
            if (err) {
                interaction.editReply({content: `Failed to fetch configuration data! Error: ${err}`})
                return;
            }

            const embed = new EmbedBuilder()
                    .setTitle("A new moderation action!")
                    .setDescription("A new moderation action has been taken!")
                    .addFields(
                        { name: 'Action type:', value: 'Kick' },
                        { name: "Moderator:", value: `<@${interaction.user.id}>`, inline: true},
                        { name: 'Target:', value: `<@${user.id}>`, inline: true },
                        { name: 'Reason:', value: reason, inline: false }
                    )
                    .setTimestamp()
                    .setColor(Colors.DarkBlue)
                    .setFooter(
                        {text: `Post ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png'}
                    );

            client.channels.fetch(res.configuration.logs_channel).then(channel => {
                channel.send( {embeds: [embed] });
            }).catch(error => {
                console.log(err);
            });
        })

        await interaction.editReply({
          content: `✅ Successfully kicked <@${user.id}>.`,
          ephemeral: true
        });
    } else if (interaction.options.getSubcommand() === 'mute') {

        const user = interaction.options.getUser('user');

        if (interaction.user == user) {
            await interaction.editReply({content: "You're not allowed to mute yourself!"})
            return;
        }
        if (discord_client.user == user) {
            await interaction.editReply({content: "You're not allowed to mute me!"})
            return;
        }

        const duration = interaction.options.getNumber('duration') || true;
        const client = new MongoClient(process.env.MONGO_URI);

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        try {
            await client.connect();
        
            const db = client.db("Angira");
            const config = await db.collection("Configuration").findOne({ "server_id": new MongoDB.Long(interaction.guild.id) });

            if (!config) {
                await interaction.editReply({ content: "No configuration found for this guild." });
                return;
            }

            const mute_role = await interaction.guild.roles.fetch(config.configuration.mute_role);

            member.roles.add([mute_role]);
        
            const embed = new EmbedBuilder()
                    .setTitle("A new moderation action!")
                    .setDescription("A new moderation action has been taken!")
                    .addFields(
                        { name: 'Action type:', value: 'Mute' },
                        { name: "Moderator:", value: `<@${interaction.user.id}>`, inline: true},
                        { name: 'Target:', value: `<@${user.id}>`, inline: true }
                    )
                    .setTimestamp()
                    .setColor(Colors.DarkBlue)
                    .setFooter(
                        {text: `Post ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png'}
                    );
            
            const logChannel = await interaction.client.channels.fetch(config.configuration.logs_channel);
            await logChannel.send({ embeds: [embed] });
            
            await interaction.editReply({ content: `✅ Successfully muted the <@${user.id}> for \`${duration}\` seconds.` });
            
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: `❌ Error occurred: ${err.message}` });
        
        } finally {
            await client.close();
        }
    } else if (interaction.options.getSubcommand() === 'unmute') {

        const user = interaction.options.getUser('user');

        if (interaction.user == user) {
            await interaction.editReply({content: "You're not allowed to unmute yourself!"})
            return;
        }
        if (discord_client.user == user) {
            await interaction.editReply({content: "You're not allowed to unmute me!"})
            return;
        }

        const client = new MongoClient(process.env.MONGO_URI);

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        try {
            await client.connect();
        
            const db = client.db("Angira");
            const config = await db.collection("Configuration").findOne({ "server_id": new MongoDB.Long(interaction.guild.id) });

            if (!config) {
                await interaction.editReply({ content: "No configuration found for this guild." });
                return;
            }

            const mute_role = await interaction.guild.roles.fetch(config.configuration.mute_role);

            member.roles.remove([mute_role]);
        
            const embed = new EmbedBuilder()
                    .setTitle("A new moderation action!")
                    .setDescription("A new moderation action has been taken!")
                    .addFields(
                        { name: 'Action type:', value: 'Unmute' },
                        { name: "Moderator:", value: `<@${interaction.user.id}>`, inline: true},
                        { name: 'Target:', value: `<@${user.id}>`, inline: true }
                    )
                    .setTimestamp()
                    .setColor(Colors.DarkBlue)
                    .setFooter(
                        {text: `Post ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png'}
                    );
            
            
            const logChannel = await interaction.client.channels.fetch(config.configuration.logs_channel);
            await logChannel.send({ embeds: [embed] });
            
            await interaction.editReply({ content: `✅ Successfully unmuted the ${user.name}.` });
            
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: `❌ Error occurred: ${err.message}` });
        
        } finally {
            await client.close();
        }
    } else if (interaction.options.getSubcommand() === 'slowmode') {



        const seconds = interaction.options.getNumber('seconds');

        if (seconds > 21600 || seconds < 0) {
            await interaction.editReply({ content: "The option `seconds` must be less than 21600 and more than 0!" });
            return;
        }

        const inter_channel = interaction.channel;
        await inter_channel.setRateLimitPerUser(seconds);

        const client = new MongoClient(process.env.MONGO_URI);

        try {
            await client.connect();
        
            const db = client.db("Angira");
            const config = await db.collection("Configuration").findOne({ "server_id": new MongoDB.Long(interaction.guild.id) });

            if (!config) {
                await interaction.editReply({ content: "No configuration found for this guild." });
                return;
            }
        
            const embed = new EmbedBuilder()
                    .setTitle("A new moderation action!")
                    .setDescription("A new moderation action has been taken!")
                    .addFields(
                        { name: 'Action type:', value: 'Slowmode' },
                        { name: "Moderator:", value: `<@${interaction.user.id}>`, inline: true},
                        { name: 'Target:', value: `<#${inter_channel.id}>`, inline: true }
                    )
                    .setTimestamp()
                    .setColor(Colors.DarkBlue)
                    .setFooter(
                        {text: `Post ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png'}
                    );
            
            const logChannel = await interaction.client.channels.fetch(config.configuration.logs_channel);
            await logChannel.send({ embeds: [embed] });
            
            await interaction.editReply({ content: `✅ Successfully slowmoded the channel to \`${seconds}\` seconds.` });
            
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: `❌ Error occurred: ${err.message}` });
        
        } finally {
            await client.close();
        }
    } else if (interaction.options.getSubcommand() === 'clear') {


        const amount = interaction.options.getNumber('amount');

        if (amount > 20000 || amount < 1) {
            await interaction.editReply({ content: "The option `seconds` must be less than 20000 and more than 1!" });
            return;
        }

        const inter_channel = interaction.channel;

        inter_channel.bulkDelete(amount)
                .then(messages => console.log(`Deleted ${messages.size} messages`))
                .catch(console.error);

        const client = new MongoClient(process.env.MONGO_URI);

        try {
            await client.connect();
        
            const db = client.db("Angira");
            const config = await db.collection("Configuration").findOne({ "server_id": new MongoDB.Long(interaction.guild.id) });

            if (!config) {
                await interaction.editReply({ content: "No configuration found for this guild." });
                return;
            }
        
            const embed = new EmbedBuilder()
                    .setTitle("A new moderation action!")
                    .setDescription("A new moderation action has been taken!")
                    .addFields(
                        { name: 'Action type:', value: 'Clear (Bulkdelete)' },
                        { name: "Moderator:", value: `<@${interaction.user.id}>`, inline: true},
                        { name: 'Target:', value: `<@${inter_channel.id}>`, inline: true }
                    )
                    .setTimestamp()
                    .setColor(Colors.DarkBlue)
                    .setFooter(
                        {text: `Post ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png'}
                    );
            
            const logChannel = await interaction.client.channels.fetch(config.configuration.logs_channel);
            await logChannel.send({ embeds: [embed] });
            
            await interaction.editReply({ content: `✅ Successfully cleared the channel by removing ${amount} messages.` });
            
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: `❌ Error occurred: ${err.message}` });
        
        } finally {
            await client.close();
        }
    } else if (interaction.options.getSubcommand() === 'lock') {

        const inter_channel = interaction.channel;
        
        const everyoneRole = interaction.guild.roles.everyone;
        
        for (const roleId of c.configuration.moderation_roles) {
            const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
            if (role) {
                inter_channel.permissionOverwrites.edit(role, { SendMessages: true });
            }
        }

        everyoneRole.setPermissions(0n)
            .then(() => {
                inter_channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
                interaction.editReply({ content: `✅ Successfully locked the channel <#${inter_channel.id}>.` });
            })
            .catch(err => {
                console.error(err);
                interaction.editReply({ content: `❌ Error occurred while locking the channel: ${err.message}` });
            });
    } else if (interaction.options.getSubcommand() === 'unlock') {

        const inter_channel = interaction.channel;
        
        const everyoneRole = interaction.guild.roles.everyone;

        everyoneRole.setPermissions(0n)
            .then(() => {
                inter_channel.permissionOverwrites.edit(everyoneRole, { SendMessages: true });
                interaction.editReply({ content: `✅ Successfully locked the channel <#${inter_channel.id}>.` });
            })
            .catch(err => {
                console.error(err);
                interaction.editReply({ content: `❌ Error occurred while locking the channel: ${err.message}` });
            });
    }
  }
};
const { Client, Events, Collection, GatewayIntentBits, Routes, REST, EmbedBuilder, Colors, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ActionRowBuilder, ChannelType, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MongoClient, Long} = require('mongodb');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv')
const process = require('process');
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

let selected = {}

client.on(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.commands = new Collection();

let cmds = [];

const folderPath = path.join(__dirname, 'commands');

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

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      try {
        await interaction.editReply({ content: 'There was an error executing the command.' });
      } catch (err) {
        await interaction.reply({ content: 'There was an error executing the command.', ephemeral: true });
      }
    }
  }

  if (interaction.isStringSelectMenu() || interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
    if (interaction.customId.startsWith('LogsChannelSelect')) {
      await interaction.deferUpdate();
      const channel = interaction.values[0];
      const mClient = new MongoClient(process.env.MONGO_URI);
      await mClient.connect();
      const db = mClient.db("Angira");
      const config_collection = db.collection("Configuration");

      await config_collection.updateOne(
        { "server_id": new Long(interaction.guild.id) },
        { $set: { "configuration.logs_channel": new Long(channel) } },
        { upsert: true }
      );

      await interaction.editReply({ content: "Logs channel has been set successfully!", components: [] });

      const embed = new EmbedBuilder()
                  .setTitle("Server Setup Wizard")
                  .setDescription("**Step 2:** Please select the role that will be used for muting users.")
                  .setColor(Colors.Blue);
      const selectMenu = new RoleSelectMenuBuilder({
          custom_id: `MuteRoleSelect-${interaction.id}`,
          placeholder: 'Select a role for muting users',
          min_values: 1,
          max_values: 1,
      })
      
      await interaction.editReply({ content: "", embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
    }
    if (interaction.customId.startsWith('MuteRoleSelect')) {
      await interaction.deferUpdate();
      const role = interaction.values[0];
      const mClient = new MongoClient(process.env.MONGO_URI);
      await mClient.connect();
      const db = mClient.db("Angira");
      const config_collection = db.collection("Configuration");

      await config_collection.updateOne(
        { "server_id": new Long(interaction.guild.id) },
        { $set: { "configuration.mute_role": new Long(role) } },
        { upsert: true }
      );

      await interaction.editReply({ content: "Mute role has been set successfully!" });

      const embed = new EmbedBuilder()
                  .setTitle("Server Setup Wizard")
                  .setDescription("**Step 3:** Please select the category where tickets will be created.")
                  .setColor(Colors.Blue);
      const selectMenu = new ChannelSelectMenuBuilder({
          custom_id: `TicketCategorySelect-${interaction.id}`,
          placeholder: 'Select a category for tickets',
          min_values: 1,
          max_values: 1,
      })
          .addChannelTypes(ChannelType.GuildCategory);
      
      await interaction.editReply({ content: "", embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
    }
    if (interaction.customId.startsWith('TicketCategorySelect')) {
      await interaction.deferUpdate();
      const category = interaction.values[0];
      const mClient = new MongoClient(process.env.MONGO_URI);
      await mClient.connect();
      const db = mClient.db("Angira");
      const config_collection = db.collection("Configuration");

      await config_collection.updateOne(
        { "server_id": new Long(interaction.guild.id) },
        { $set: { "configuration.ticket_category": new Long(category) } },
        { upsert: true }
      );

      await interaction.editReply({ content: "Ticket category has been set successfully!", components: [] });

      const embed = new EmbedBuilder()
                  .setTitle("Server Setup Wizard")
                  .setDescription("**Step 4:** Please select the channel where users' reports will be sent.")
                  .setColor(Colors.Blue);
      const selectMenu = new ChannelSelectMenuBuilder({
          custom_id: `ReportChannelSelect-${interaction.id}`,
          placeholder: 'Select a channel for reports',
          min_values: 1,
          max_values: 1,
      })
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
      await interaction.editReply({ content: "", embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
    }
    if (interaction.customId.startsWith('ReportChannelSelect')) {
      await interaction.deferUpdate();
      const channel = interaction.values[0];
      const mClient = new MongoClient(process.env.MONGO_URI);
      await mClient.connect();
      const db = mClient.db("Angira");
      const config_collection = db.collection("Configuration");

      await config_collection.updateOne(
        { "server_id": new Long(interaction.guild.id) },
        { $set: { "configuration.report_channel": new Long(channel) } },
        { upsert: true }
      );

      await interaction.editReply({ content: "Report channel has been set successfully!", components: [] });


      const embed = new EmbedBuilder()
                  .setTitle("Server Setup Wizard")
                  .setDescription("**Step 5:** Please select the channel where users' suggestions will be sent.")
                  .setColor(Colors.Blue);
      const selectMenu = new ChannelSelectMenuBuilder({
          custom_id: `SuggestionChannelSelect-${interaction.id}`,
          placeholder: 'Select a channel for suggestions',
          min_values: 1,
          max_values: 1,
      })
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
      await interaction.editReply({ content: "", embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
    }
    if (interaction.customId.startsWith('SuggestionChannelSelect')) {
      await interaction.deferUpdate();
      const channel = interaction.values[0];
      const mClient = new MongoClient(process.env.MONGO_URI);
      await mClient.connect();
      const db = mClient.db("Angira");
      const config_collection = db.collection("Configuration");

      await config_collection.updateOne(
        { "server_id": new Long(interaction.guild.id) },
        { $set: { "configuration.suggestion_channel": new Long(channel) } },
        { upsert: true }
      );

      await interaction.editReply({ content: "Suggestion channel has been set successfully!", components: [] });


      const embed = new EmbedBuilder()
                  .setTitle("Server Setup Wizard")
                  .setDescription("**Step 6:** Please select the channel where users' level-up messages will be sent.")
                  .setColor(Colors.Blue);
      const selectMenu = new ChannelSelectMenuBuilder({
          custom_id: `LevelChannelSelect-${interaction.id}`,
          placeholder: 'Select a channel for level-up messages',
          min_values: 1,
          max_values: 1,
      })
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
      await interaction.editReply({ content: "", embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
    }
    if (interaction.customId.startsWith('LevelChannelSelect')) {
      await interaction.deferUpdate();
      const channel = interaction.values[0];
      const mClient = new MongoClient(process.env.MONGO_URI);
      await mClient.connect();
      const db = mClient.db("Angira");
      const config_collection = db.collection("Configuration");

      await config_collection.updateOne(
        { "server_id": new Long(interaction.guild.id) },
        { $set: { "configuration.leveling_channel": new Long(channel) } },
        { upsert: true }
      );

      await interaction.editReply({ content: "Leveling channel has been set successfully!", components: []});

      const embed = new EmbedBuilder()
                  .setTitle("Server Setup Wizard")
                  .setDescription("**Step 7:** Please select the roles that can view ticket channels.")
                  .setColor(Colors.Blue);
      const selectMenu = new RoleSelectMenuBuilder({
          custom_id: `TicketViewRoleSelect-${interaction.id}`,
          placeholder: 'Select the roles that can view ticket channels',
          min_values: 1,
          max_values: 25
      })
      const button = new ButtonBuilder()
          .setCustomId('c-1')
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Success);
      const SelectRow = new ActionRowBuilder().addComponents(selectMenu);
      const ActionRow = new ActionRowBuilder().addComponents(button);
      await interaction.editReply({ content: "", embeds: [embed], components: [SelectRow, ActionRow] });
    }
    if (interaction.customId.startsWith('TicketViewRoleSelect')) {
      await interaction.deferUpdate();
      const channel = interaction.values;
      
      selected[interaction.guild.id] = channel;
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('report-')) {
      try {
        await interaction.deferReply({ephemeral: true});
        const userId = interaction.customId.slice(7);
        const user = await interaction.guild.members.fetch(userId);
        const reason = interaction.fields.getTextInputValue("reason");
  
        const mClient = new MongoClient(process.env.MONGO_URI);
        await mClient.connect();
        const db = mClient.db("Angira");
        const config_collection = db.collection("Configuration");
        const config = await config_collection.findOne({ "server_id": new Long(interaction.guild.id) });
  
        const report_channel = interaction.guild.channels.cache.get(config.configuration.report_channel.toString());
        if (!report_channel) {
          await interaction.editReply({ content: "Failed to fetch report channel!" });
          return;
        }
  
        const embed = new EmbedBuilder()
          .setTitle("A new report!")
          .setDescription("A new report has been made!")
          .addFields(
            { name: "Reporting user:", value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reported user:', value: `<@${user.id}>`, inline: true },
            { name: 'Reason:', value: reason, inline: false }
          )
          .setTimestamp()
          .setColor(Colors.DarkBlue)
          .setFooter({ text: `Report ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png' });
  
        await report_channel.send({ embeds: [embed] });
        await interaction.editReply({ content: 'Your report was received successfully!' });
  
      } catch (err) {
        console.error("Error processing report modal:", err);
        if (!interaction.replied) {
          await interaction.editReply({ content: 'Something went wrong while processing your report.', ephemeral: true });
        }
      }
    } else if (interaction.customId == 'suggestion_modal') {
      try {
        await interaction.deferReply({ephemeral: true});
        const suggestion = interaction.fields.getTextInputValue("suggestion");
  
        const mClient = new MongoClient(process.env.MONGO_URI);
        await mClient.connect();
        const db = mClient.db("Angira");
        const config_collection = db.collection("Configuration");
        const config = await config_collection.findOne({ "server_id": new Long(interaction.guild.id) });
  
        const suggest_channel = interaction.guild.channels.cache.get(config.configuration.suggestion_channel.toString());
        if (!suggest_channel) {
          await interaction.reply({ content: "Failed to fetch suggestion channel!" });
          return;
        }
  
        const embed = new EmbedBuilder()
          .setTitle("A new suggestion!")
          .setDescription("A new suggestion has been made!")
          .addFields(
            { name: "Suggesting user:", value: `<@${interaction.user.id}>`, inline: false },
            { name: 'Suggestion:', value: suggestion, inline: false }
          )
          .setTimestamp()
          .setColor(Colors.DarkBlue)
          .setFooter({ text: `Suggestion ID: ${interaction.id}`, iconURL: 'https://message.style/cdn/images/b603d3469f4ea30023acb53a054f61e50f83ec4bb3827bfd3affa5bc97963369.png' });
  
        await suggest_channel.send({ embeds: [embed] });
        await interaction.editReply({ content: 'Your suggestion was received successfully!' });
  
      } catch (err) {
        console.error("Error processing suggestion modal:", err);
        if (!interaction.replied) {
          await interaction.editReply({ content: 'Something went wrong while processing your suggestion.', ephemeral: true });
        }
      }
    }
  }
  if (interaction.isButton() && interaction.customId.startsWith('confirm-')) {
    await interaction.deferReply({ephemeral: true});
    try {
      const userId = interaction.customId.slice(8);
      
      const mClient = new MongoClient(process.env.MONGO_URI);
      await mClient.connect();
      const db = mClient.db("Angira");
      const config_collection = db.collection("Configuration");
      const ticket_collection = db.collection("Ticket");

      const config = await config_collection.findOne({ "server_id": new Long(interaction.guild.id) });
      if (!config) {
        await interaction.reply({ content: "Failed to fetch guild configuration!" });
        return;
      }

      if (userId != interaction.user.id.toString()) {
        await interaction.reply({ content: "Only the creator of the ticket can press the button!" });
        return;
      }

      const ticket_card = await ticket_collection.findOne({ "server_id": new Long(interaction.guild.id), "user_id": new Long(interaction.user.id)})

      const ticket_channel = interaction.guild.channels.cache.get(ticket_card.channel_id.toString());

      if (!ticket_channel) {
        await interaction.reply({ content: "Failed to fetch ticket channel!" });
        return;
      }

      await ticket_collection.deleteOne({ "server_id": new Long(interaction.guild.id), "user_id": new Long(interaction.user.id)})

      await ticket_channel.delete()

    } catch (err) {
      await interaction.editReply(`Failed to close channel! Error: ${err}`)
    }
  }
  if (interaction.isButton() && interaction.customId === 'c-1') {
    await interaction.deferUpdate();
    if (selected[interaction.guild.id].length === 0) {
      await interaction.editReply({ content: "You must select at least one role!" });
      return;
    }
    const mClient = new MongoClient(process.env.MONGO_URI);
    await mClient.connect();
    const db = mClient.db("Angira");
    const config_collection = db.collection("Configuration");
    await config_collection.updateOne(
      { "server_id": new Long(interaction.guild.id) },
      { $set: { "configuration.ticket_viewroles": selected[interaction.guild.id] } },
      { upsert: true }
    );

    await interaction.editReply({ components: [] })

    const embed = new EmbedBuilder()
                  .setTitle("Server Setup Wizard")
                  .setDescription("**Step 8:** Please select the roles that will be used to identify moderators.")
                  .setColor(Colors.Blue);
    const selectMenu = new RoleSelectMenuBuilder({
        custom_id: `TicketViewRoleSelect-${interaction.id}`,
        placeholder: 'Select the roles that can view ticket channels',
        min_values: 1,
        max_values: 25
    })
    const button = new ButtonBuilder()
        .setCustomId('c-2')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success);
    const SelectRow = new ActionRowBuilder().addComponents(selectMenu);
    const ActionRow = new ActionRowBuilder().addComponents(button);
    await interaction.editReply({ content: "", embeds: [embed], components: [SelectRow, ActionRow] });
  }
  if (interaction.isButton() && interaction.customId === 'c-2') {
    await interaction.deferUpdate();
    if (selected[interaction.guild.id].length === 0) {
      await interaction.editReply({ content: "You must select at least one role!" });
      return;
    }
    const mClient = new MongoClient(process.env.MONGO_URI);
    await mClient.connect();
    const db = mClient.db("Angira");
    const config_collection = db.collection("Configuration");
    await config_collection.updateOne(
      { "server_id": new Long(interaction.guild.id) },
      { $set: { "configuration.moderation_roles": selected[interaction.guild.id] } },
      { upsert: true }
    );
    selected[interaction.guild.id] = [];
    await interaction.editReply({ content: "Everything has been set! Thank you for choosing Angira!", embeds: [], components: [] });
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  const mClient = new MongoClient(process.env.MONGO_URI);
  await mClient.connect();
  const db = mClient.db("Angira");
  const config_collection = db.collection("Configuration");
  
  const config = await config_collection.findOne({ "server_id": new Long(message.guild.id) });
  if (!config) {
    return
  }
  
  if (message.content === "!help") {

    let cmds = "";

    for (const file of jsFiles) {
      const filePath = path.join(folderPath, file);
      const command = require(filePath);
      cmds += `\n * **/${command.data.name}**: ${command.data.description}\n\n`;
      const subcommands = command.data.options
        .filter(i => typeof i === 'SUB_COMMAND')
        .map(option => cmds += `-> **/${command.data.name} ${option.name}**: ${option.description}\n`);
    }

    const embed = new EmbedBuilder()
      .setTitle("Angira Help")
      .setDescription(`Here are some commands you can use:\n\n${cmds}`)
      .setColor(Colors.Blue)
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

    await message.channel.send({ embeds: [embed] });
    return;
  }

  const level_collection = db.collection("Level");

  const prev_level = await level_collection.findOne({ "server_id": new Long(message.guild.id), "user_id": new Long(message.author.id) });
  if (!prev_level) {
    await level_collection.insertOne({ "server_id": new Long(message.guild.id), "user_id": new Long(message.author.id), "xp": 1, "level": 1 })
    return
  }

  const level = await level_collection.findOne({ "server_id": new Long(message.guild.id), "user_id": new Long(message.author.id) });

  const xp = level.xp + 1;

  const xp_req = level.level * 10;

  if (xp > xp_req) {
    await level_collection.updateOne({ "server_id": new Long(message.guild.id), "user_id": new Long(message.author.id) }, { $set: { "xp": 1, "level": level.level + 1 } })
    const embed = new EmbedBuilder()
      .setTitle("Level up!")
      .setDescription(`You leveled up to level ${level.level + 1}!`)
      .setColor(Colors.DarkBlue)
      .setFooter({ text: `User ID: ${message.author.id}`, iconURL: message.author.displayAvatarURL() });
    
    const level_channel = message.guild.channels.cache.get(config.configuration.leveling_channel.toString());

    await level_channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
  } else {
    await level_collection.updateOne({ "server_id": new Long(message.guild.id), "user_id": new Long(message.author.id) }, { $set: { "xp": xp } })
  }
})

client.login(process.env.TOKEN);
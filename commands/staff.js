const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();


module.exports = {
  data: new SlashCommandBuilder()
        .setName('staff')
        .setDescription('Use for obtaining information about the bot.')
        .addSubcommand(subcommand =>
          subcommand
            .setName('promote')
            .setDescription("Promotes a user to a new role with a reason.")
            .addUserOption(option =>
              option.setName('user')
                .setDescription('The user to promote')
                .setRequired(true)
            )
            .addRoleOption(option => 
                option.setName('role')
                    .setDescription('The role to promote the user to')
                    .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('reason')
                .setDescription('The reason for the promotion')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('demote')
            .setDescription("Demotes a user to a new role with a reason.")
            .addUserOption(option =>
              option.setName('user')
                .setDescription('The user to demote')
                .setRequired(true)
            )
            .addRoleOption(option => 
                option.setName('role')
                    .setDescription('The role to demote the user to')
                    .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('reason')
                .setDescription('The reason for the demotion')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('warn')
            .setDescription("Issues a warning to a staff member.")
            .addUserOption(option =>
              option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('reason')
                .setDescription('The reason for the warning')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('note')
            .setDescription("Adds an internal note on a staff member's profile.")
            .addUserOption(option =>
              option.setName('user')
                .setDescription('The user to demote')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('note')
                .setDescription('The internal note to add')
                .setRequired(false)
            )
        ),
  
    async execute(interaction) {

        await interaction.deferReply({'ephemeral': true});

        const client = new MongoClient(process.env.MONGO_URI);
              
        await client.connect();
          
        const db = client.db("Angira");
    
        const config_collection = db.collection("Configuration");

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

        if (interaction.options.getSubcommand() === 'promote') {
            const user = interaction.options.getUser('user');

            if (!user.top_role || user.top_role.position >= interaction.member.roles.highest.position) {
                await interaction.editReply({ content: "You cannot promote this user because they have a higher or equal role than you." });
                return;
            }

            const role = interaction.options.getRole('role');

            if (!role || role.position >= interaction.guild.members.me.roles.highest.position) {
                await interaction.editReply({ content: "You cannot promote this user to this role because it is higher than my highest role." });
                return;
            }

            if (!role || role.position >= interaction.user.top_role.position) {
                await interaction.editReply({ content: "You cannot promote this user to this role because it is higher than my highest role." });
                return;
            }

            const reason = interaction.options.getString('reason') || 'No reason provided';

            const member = await interaction.guild.members.fetch(user.id);
            await member.roles.add(role);

            await interaction.editReply({ content: `Successfully promoted ${user} to ${role} for: ${reason}` });
        } else if (interaction.options.getSubcommand() === 'demote') {
            const user = interaction.options.getUser('user');
            if (!user.top_role || user.top_role.position >= interaction.member.roles.highest.position) {
                await interaction.editReply({ content: "You cannot demote this user because they have a higher or equal role than you." });
                return;
            }
            const role = interaction.options.getRole('role');

            if (!user.top_role || user.top_role.position <= interaction.member.roles.highest.position) {
                await interaction.editReply({ content: "You cannot demote this user because they have a higher or equal role than you." });
                return;
            }

            if (!role || role.position >= interaction.user.top_role.position) {
                await interaction.editReply({ content: "You cannot demote this user to this role because it is higher than my highest role." });
                return;
            }

            const reason = interaction.options.getString('reason') || 'No reason provided';

            const member = await interaction.guild.members.fetch(user.id);
            await member.roles.add(role);

            await interaction.editReply({ content: `Successfully demoted ${user} to ${role} for: ${reason}` });
        } else if (interaction.options.getSubcommand() === 'warn') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            const warn_collection = db.collection("Warnings");
            const existingWarn = await warn_collection.findOne({ userId: user.id, guildId: interaction.guild.id, type: "staff" });

            if (!(existingWarn)) {
                await warn_collection.insertOne({
                    userId: user.id,
                    guildId: interaction.guild.id,
                    type: "staff",
                    warnings: 1
                });
            } else {
                await warn_collection.updateOne(
                    { userId: user.id, guildId: interaction.guild.id, type: "staff" },
                    { $inc: { warnings: 1 } }
                );
            }

            if (warn_collection.findOne({ userId: user.id, guildId: interaction.guild.id, type: "staff" }).warnings >= 3) {
                const member = await interaction.guild.members.fetch(user.id);
                const role = interaction.guild.roles.cache.find(role => role.name === 'Staff');
                if (role) {
                    await member.roles.remove(role);
                    await interaction.editReply({ content: `User ${user} has been warned 3 times and has been removed from the Staff role.` });
                } else {
                    await interaction.editReply({ content: `User ${user} has been warned 3 times but no Staff role found to remove.` });
                }
            }

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Warning Issued')
                .setDescription(`You have been warned by ${interaction.user.tag} for: ${reason}`)
                .setTimestamp();
            embed.setFooter({ text: `Warned by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
            embed.setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() });
            embed.setThumbnail(interaction.guild.iconURL());

            

            await user.send({ embeds: [embed] });

            await interaction.editReply({ content: `Successfully warned ${user} for: ${reason}` });
        } else if (interaction.options.getSubcommand() === 'note') {
            const user = interaction.options.getUser('user');
            const note = interaction.options.getString('note');

            const note_collection = db.collection("Notes");
            await note_collection.insertOne({
                user_id: interaction.user.id,
                targetId: user.id,
                guildId: interaction.guild.id,
                note: note
            });

            await interaction.editReply({ content: `Successfully added a note for ${user}: ${note}` });
        }
    }
};
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const commandRoles = new Map();
const SETUP_USER_ID = '1177592138968604675';
const GUILD_ID = '1177592138968604675';

const commands = [
  { name: 'setup', description: 'Bot-Commands und erlaubte Rollen verwalten.' },
  { name: 'nachricht', description: 'Sendet eine Nachricht als Embed in diesen Channel.', options: [
    { name: 'text', description: 'Text der Embed-Nachricht', type: 3, required: true },
    { name: 'bild', description: 'Bild-URL (optional)', type: 3, required: false },
    { name: 'farbe', description: 'Embed-Farbe als HEX, z.B. #ff0000', type: 3, required: false }
  ]},
  { name: 'ausnach', description: 'Erstellt eine Nachricht mit bis zu 5 auswählbaren Optionen.', options: [
    { name: 'nachricht', description: 'Die Hauptnachricht', type: 3, required: true },
    { name: 'option1', description: 'Text/Wort für Auswahl 1', type: 3, required: true },
    { name: 'option1interaktion', description: 'Antwort bei Auswahl 1', type: 3, required: true },
    { name: 'option2', description: 'Text/Wort für Auswahl 2', type: 3, required: false },
    { name: 'option2interaktion', description: 'Antwort bei Auswahl 2', type: 3, required: false },
    { name: 'option3', description: 'Text/Wort für Auswahl 3', type: 3, required: false },
    { name: 'option3interaktion', description: 'Antwort bei Auswahl 3', type: 3, required: false },
    { name: 'option4', description: 'Text/Wort für Auswahl 4', type: 3, required: false },
    { name: 'option4interaktion', description: 'Antwort bei Auswahl 4', type: 3, required: false },
    { name: 'option5', description: 'Text/Wort für Auswahl 5', type: 3, required: false },
    { name: 'option5interaktion', description: 'Antwort bei Auswahl 5', type: 3, required: false }
  ]}
];

const ausnachResponses = new Map();

function hasCommandAccess(interaction, commandName) {
  if (interaction.user.id === SETUP_USER_ID) return true;
  const roleId = commandRoles.get(`${interaction.guildId}:${commandName}`);
  return roleId ? interaction.member.roles.cache.has(roleId) : false;
}

client.once('ready', async () => {
  console.log(`Bot online als ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
    console.log(`Slash-Commands für Server ${GUILD_ID} registriert.`);
  } catch (error) { console.error('Fehler beim Registrieren der Commands:', error); }
});

function colorValue(value) {
  const color = value || '#5865F2';
  if (!/^#?[0-9A-Fa-f]{6}$/.test(color)) return null;
  return color.startsWith('#') ? color : `#${color}`;
}

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'setup') {
      if (interaction.user.id !== SETUP_USER_ID) {
        return interaction.reply({ content: '❌ Du darfst `/setup` nicht benutzen.', ephemeral: true });
      }
      const embed = new EmbedBuilder().setTitle('⚙️ Bot Setup').setDescription('Wähle einen Command aus und danach die Rolle, die ihn benutzen darf.').addFields(
        { name: '/nachricht', value: 'Embed-Nachrichten senden' },
        { name: '/ausnach', value: 'Auswahl-Nachrichten erstellen' }
      ).setColor('#5865F2');
      const menu = new StringSelectMenuBuilder().setCustomId(`setup_command_${interaction.user.id}`).setPlaceholder('Command auswählen ...').addOptions(
        { label: '/nachricht', value: 'nachricht', description: 'Rolle für /nachricht festlegen' },
        { label: '/ausnach', value: 'ausnach', description: 'Rolle für /ausnach festlegen' }
      );
      return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
    }

    if (!hasCommandAccess(interaction, interaction.commandName)) {
      return interaction.reply({ content: '❌ Du hast keine Rolle, die für diesen Command freigeschaltet ist.', ephemeral: true });
    }

    if (interaction.commandName === 'nachricht') {
      const text = interaction.options.getString('text', true);
      const bild = interaction.options.getString('bild');
      const farbe = colorValue(interaction.options.getString('farbe'));
      if (!farbe) return interaction.reply({ content: '❌ Ungültige Farbe. Verwende z.B. `#ff0000`.', ephemeral: true });
      const embed = new EmbedBuilder().setDescription(text).setColor(farbe).setTimestamp();
      if (bild) { try { new URL(bild); embed.setImage(bild); } catch { return interaction.reply({ content: '❌ Die Bild-URL ist ungültig.', ephemeral: true }); } }
      await interaction.channel.send({ embeds: [embed] });
      return interaction.reply({ content: '✅ Nachricht wurde gesendet.', ephemeral: true });
    }

    if (interaction.commandName === 'ausnach') {
      const mainText = interaction.options.getString('nachricht', true);
      const options = [];
      for (let i = 1; i <= 5; i++) {
        const label = interaction.options.getString(`option${i}`);
        const response = interaction.options.getString(`option${i}interaktion`);
        if ((label && !response) || (!label && response)) return interaction.reply({ content: `❌ Option ${i}: beide Felder müssen zusammen angegeben werden.`, ephemeral: true });
        if (label && response) options.push({ number: i, label, response });
      }
      const menuId = `ausnach_menu_${interaction.user.id}_${Date.now()}`;
      const menu = new StringSelectMenuBuilder().setCustomId(menuId).setPlaceholder('Wähle eine Option aus ...').addOptions(options.map(option => ({ label: option.label.slice(0, 100), value: String(option.number), description: 'Klicke hier für die Interaktion' })));
      const embed = new EmbedBuilder().setDescription(mainText).setColor('#5865F2').setTimestamp();
      await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
      ausnachResponses.set(menuId, options);
      return interaction.reply({ content: '✅ Auswahl-Nachricht wurde gesendet.', ephemeral: true });
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('setup_command_')) {
      if (interaction.user.id !== SETUP_USER_ID) return interaction.reply({ content: '❌ Du darfst das Setup nicht benutzen.', ephemeral: true });
      const commandName = interaction.values[0];
      const roles = interaction.guild.roles.cache.filter(r => r.id !== interaction.guild.id && !r.managed).sort((a, b) => b.position - a.position).first(25);
      const roleMenu = new StringSelectMenuBuilder().setCustomId(`setup_role_${interaction.user.id}_${commandName}`).setPlaceholder('Rolle auswählen ...').addOptions(roles.map(role => ({ label: role.name.slice(0, 100), value: role.id, description: `Darf /${commandName} benutzen` })));
      return interaction.update({ content: `⚙️ Rolle für **/${commandName}** auswählen:`, embeds: [], components: [new ActionRowBuilder().addComponents(roleMenu)] });
    }

    if (interaction.customId.startsWith('setup_role_')) {
      if (interaction.user.id !== SETUP_USER_ID) return interaction.reply({ content: '❌ Du darfst das Setup nicht benutzen.', ephemeral: true });
      const parts = interaction.customId.split('_');
      const commandName = parts[3];
      const roleId = interaction.values[0];
      commandRoles.set(`${interaction.guildId}:${commandName}`, roleId);
      const role = interaction.guild.roles.cache.get(roleId);
      return interaction.update({ content: `✅ **/${commandName}** darf jetzt die Rolle **${role?.name ?? 'Unbekannt'}** benutzen.\n\nDu kannst den Command weiterhin benutzen.`, embeds: [], components: [] });
    }

    if (interaction.customId.startsWith('ausnach_menu_')) {
      const options = ausnachResponses.get(interaction.customId);
      if (!options) return interaction.reply({ content: '❌ Diese Auswahl ist nicht mehr verfügbar.', ephemeral: true });
      const selected = options.find(option => String(option.number) === interaction.values[0]);
      if (!selected) return interaction.reply({ content: '❌ Auswahl nicht gefunden.', ephemeral: true });
      return interaction.reply({ content: selected.response, ephemeral: true });
    }
  }
});

client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.find(ch => ch.name === 'willkommen' && ch.isTextBased());
  if (!channel) return;
  const embed = new EmbedBuilder().setTitle('👋 Willkommen!').setDescription(`Willkommen ${member} auf **${member.guild.name}**!\n\nWir freuen uns, dass du da bist.`).addFields({ name: '👤 Benutzer', value: `${member.user.tag}`, inline: true }, { name: '👥 Mitglieder', value: `${member.guild.memberCount}`, inline: true }).setThumbnail(member.user.displayAvatarURL({ size: 256 })).setColor(0x57F287).setFooter({ text: `Willkommen bei ${member.guild.name}` }).setTimestamp();
  await channel.send({ embeds: [embed] }).catch(console.error);
});

client.login(process.env.DISCORD_TOKEN);

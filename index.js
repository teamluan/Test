require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const commands = [
  {
    name: 'nachricht',
    description: 'Sendet eine Nachricht als Embed in diesen Channel.',
    options: [
      { name: 'text', description: 'Text der Embed-Nachricht', type: 3, required: true },
      { name: 'bild', description: 'Bild-URL (optional)', type: 3, required: false },
      { name: 'farbe', description: 'Embed-Farbe als HEX, z.B. #ff0000', type: 3, required: false }
    ]
  },
  {
    name: 'ausnach',
    description: 'Erstellt eine Auswahl-Nachricht mit bis zu 5 Auswahlpunkten.'
  }
];

// Temporäre Auswahldaten – keine Datenbank nötig.
const ausnachSessions = new Map();

client.once('ready', async () => {
  console.log(`Bot online als ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash-Commands registriert.');
  } catch (error) {
    console.error('Fehler beim Registrieren der Commands:', error);
  }
});

function colorValue(value) {
  const color = value || '#5865F2';
  if (!/^#?[0-9A-Fa-f]{6}$/.test(color)) return null;
  return color.startsWith('#') ? color : `#${color}`;
}

function selectionButtons(sessionId, disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      ...[1, 2, 3, 4, 5].map(i => new ButtonBuilder()
        .setCustomId(`ausnach_slot_${sessionId}_${i}`)
        .setLabel(`${i}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || false))
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ausnach_finish_${sessionId}`).setLabel('✅ Fertig').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`ausnach_cancel_${sessionId}`).setLabel('❌ Abbrechen').setStyle(ButtonStyle.Danger)
    )
  ];
}

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ Du brauchst die Berechtigung **Nachrichten verwalten**.', ephemeral: true });
    }

    if (interaction.commandName === 'nachricht') {
      const text = interaction.options.getString('text', true);
      const bild = interaction.options.getString('bild');
      const farbe = colorValue(interaction.options.getString('farbe'));

      if (!farbe) {
        return interaction.reply({ content: '❌ Ungültige Farbe. Verwende z.B. `#ff0000`.', ephemeral: true });
      }

      const embed = new EmbedBuilder().setDescription(text).setColor(farbe).setTimestamp();

      if (bild) {
        try {
          new URL(bild);
          embed.setImage(bild);
        } catch {
          return interaction.reply({ content: '❌ Die Bild-URL ist ungültig.', ephemeral: true });
        }
      }

      await interaction.channel.send({ embeds: [embed] });
      return interaction.reply({ content: '✅ Nachricht wurde gesendet.', ephemeral: true });
    }

    if (interaction.commandName === 'ausnach') {
      const modal = new ModalBuilder()
        .setCustomId(`ausnach_start_${interaction.user.id}`)
        .setTitle('Auswahl-Nachricht erstellen');

      const textInput = new TextInputBuilder()
        .setCustomId('ausnach_text')
        .setLabel('Nachricht')
        .setPlaceholder('Schreibe hier die Nachricht...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(4000);

      modal.addComponents(new ActionRowBuilder().addComponents(textInput));
      return interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('ausnach_start_')) {
    const sessionId = `${interaction.user.id}_${Date.now()}`;
    ausnachSessions.set(sessionId, {
      userId: interaction.user.id,
      channelId: interaction.channelId,
      text: interaction.fields.getTextInputValue('ausnach_text'),
      options: {}
    });

    return interaction.reply({
      content: '✅ Nachricht gespeichert!\n\nWähle jetzt bis zu **5** Punkte aus. Bei jedem Punkt kannst du anschließend **Nachricht, Bild oder Datei** auswählen.',
      components: selectionButtons(sessionId),
      ephemeral: true
    });
  }

  if (interaction.isButton()) {
    const parts = interaction.customId.split('_');
    if (parts[0] !== 'ausnach') return;

    const action = parts[1];
    const sessionId = parts[2];
    const slot = parts[3];
    const session = ausnachSessions.get(sessionId);

    if (!session || session.userId !== interaction.user.id) {
      return interaction.reply({ content: '❌ Diese Auswahl gehört nicht zu dir oder ist abgelaufen.', ephemeral: true });
    }

    if (action === 'cancel') {
      ausnachSessions.delete(sessionId);
      return interaction.update({ content: '❌ Erstellung abgebrochen.', components: [] });
    }

    if (action === 'finish') {
      const count = Object.keys(session.options).length;
      if (count < 1) return interaction.reply({ content: '❌ Du musst mindestens einen Auswahlpunkt erstellen.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setDescription(session.text)
        .setColor('#5865F2')
        .setTimestamp();

      const lines = Object.entries(session.options).map(([number, data]) => {
        const icon = data.type === 'bild' ? '🖼️' : data.type === 'datei' ? '📎' : '💬';
        return `${icon} **${number}. ${data.name}**\n${data.value}`;
      });

      embed.addFields({ name: 'Auswahl', value: lines.join('\n\n').slice(0, 1024) });
      await interaction.channel.send({ embeds: [embed] });
      ausnachSessions.delete(sessionId);
      return interaction.update({ content: '✅ Auswahl-Nachricht wurde gesendet.', components: [] });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`ausnach_type_${sessionId}_${slot}`)
      .setPlaceholder(`Typ für Auswahl ${slot} wählen`)
      .addOptions(
        { label: 'Nachricht', description: 'Text für diesen Auswahlpunkt', value: 'nachricht', emoji: '💬' },
        { label: 'Bild', description: 'Bild-URL für diesen Auswahlpunkt', value: 'bild', emoji: '🖼️' },
        { label: 'Datei', description: 'Datei-URL für diesen Auswahlpunkt', value: 'datei', emoji: '📎' }
      );

    return interaction.reply({
      content: `**Auswahl ${slot}:** Was möchtest du hinzufügen?`,
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ausnach_type_')) {
    const [, , sessionId, slot] = interaction.customId.split('_');
    const session = ausnachSessions.get(sessionId);

    if (!session || session.userId !== interaction.user.id) {
      return interaction.reply({ content: '❌ Diese Auswahl ist abgelaufen.', ephemeral: true });
    }

    const type = interaction.values[0];
    const modal = new ModalBuilder()
      .setCustomId(`ausnach_value_${sessionId}_${slot}_${type}`)
      .setTitle(`Auswahl ${slot} – ${type}`);

    const nameInput = new TextInputBuilder()
      .setCustomId('ausnach_name')
      .setLabel('Name der Auswahl')
      .setPlaceholder(`z.B. Option ${slot}`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const valueInput = new TextInputBuilder()
      .setCustomId('ausnach_value')
      .setLabel(type === 'nachricht' ? 'Nachricht' : `${type === 'bild' ? 'Bild' : 'Datei'}-URL`)
      .setPlaceholder(type === 'nachricht' ? 'Text...' : 'https://...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(2000);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(valueInput)
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('ausnach_value_')) {
    const [, , sessionId, slot, type] = interaction.customId.split('_');
    const session = ausnachSessions.get(sessionId);

    if (!session || session.userId !== interaction.user.id) {
      return interaction.reply({ content: '❌ Diese Auswahl ist abgelaufen.', ephemeral: true });
    }

    const name = interaction.fields.getTextInputValue('ausnach_name');
    const value = interaction.fields.getTextInputValue('ausnach_value');

    if (type !== 'nachricht') {
      try { new URL(value); } catch {
        return interaction.reply({ content: '❌ Bitte eine gültige URL angeben.', ephemeral: true });
      }
    }

    session.options[slot] = { name, value, type };
    return interaction.reply({
      content: `✅ **Auswahl ${slot}** wurde gespeichert. Du kannst weitere Punkte hinzufügen oder auf **Fertig** klicken.`,
      components: selectionButtons(sessionId),
      ephemeral: true
    });
  }
});

client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.find(ch => ch.name === 'willkommen' && ch.isTextBased());
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('👋 Willkommen!')
    .setDescription(`Willkommen ${member} auf **${member.guild.name}**!\n\nWir freuen uns, dass du da bist.`)
    .addFields(
      { name: '👤 Benutzer', value: `${member.user.tag}`, inline: true },
      { name: '👥 Mitglieder', value: `${member.guild.memberCount}`, inline: true }
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setColor(0x57F287)
    .setFooter({ text: `Willkommen bei ${member.guild.name}` })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(console.error);
});

client.login(process.env.DISCORD_TOKEN);

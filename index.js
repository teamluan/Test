require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
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
  }
];

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

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'nachricht') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ Du brauchst die Berechtigung **Nachrichten verwalten**.', ephemeral: true });
    }

    const text = interaction.options.getString('text', true);
    const bild = interaction.options.getString('bild');
    const farbe = interaction.options.getString('farbe') || '#5865F2';

    if (!/^#?[0-9A-Fa-f]{6}$/.test(farbe)) {
      return interaction.reply({ content: '❌ Ungültige Farbe. Verwende z.B. `#ff0000` oder `ff0000`.', ephemeral: true });
    }

    const hex = farbe.startsWith('#') ? farbe : `#${farbe}`;

    const embed = new EmbedBuilder()
      .setDescription(text)
      .setColor(hex)
      .setTimestamp();

    if (bild) {
      try {
        new URL(bild);
        embed.setImage(bild);
      } catch {
        return interaction.reply({ content: '❌ Die Bild-URL ist ungültig.', ephemeral: true });
      }
    }

    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Nachricht wurde gesendet.', ephemeral: true });
  }
});

client.on('guildMemberAdd', async member => {
  // Willkommen wird automatisch in einem Channel namens "willkommen" gesendet.
  const channel = member.guild.channels.cache.find(
    ch => ch.name === 'willkommen' && ch.isTextBased()
  );

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

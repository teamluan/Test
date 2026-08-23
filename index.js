require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');

const OWNER_ID = '1177592138968604675';
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// No database: settings/giveaways reset when the bot restarts.
const commandRoles = new Map();
const ausnachData = new Map();
const giveaways = new Map();

const commands = [
  { name: 'setup', description: 'Bot-Commands und Rollen verwalten.' },
  {
    name: 'nachricht',
    description: 'Sendet einen Embed in den aktuellen Channel.',
    options: [
      { name: 'text', description: 'Text des Embeds.', type: 3, required: true },
      { name: 'bild', description: 'Bild-URL (optional).', type: 3, required: false },
      { name: 'farbe', description: 'HEX-Farbe, z.B. #ff0000.', type: 3, required: false }
    ]
  },
  {
    name: 'ausnach',
    description: 'Erstellt eine Nachricht mit bis zu 5 Auswahloptionen.',
    options: [
      { name: 'nachricht', description: 'Hauptnachricht.', type: 3, required: true },
      { name: 'option1', description: 'Option 1.', type: 3, required: true },
      { name: 'option1interaktion', description: 'Ephemere Antwort für Option 1.', type: 3, required: true },
      { name: 'option2', description: 'Option 2.', type: 3, required: false },
      { name: 'option2interaktion', description: 'Ephemere Antwort für Option 2.', type: 3, required: false },
      { name: 'option3', description: 'Option 3.', type: 3, required: false },
      { name: 'option3interaktion', description: 'Ephemere Antwort für Option 3.', type: 3, required: false },
      { name: 'option4', description: 'Option 4.', type: 3, required: false },
      { name: 'option4interaktion', description: 'Ephemere Antwort für Option 4.', type: 3, required: false },
      { name: 'option5', description: 'Option 5.', type: 3, required: false },
      { name: 'option5interaktion', description: 'Ephemere Antwort für Option 5.', type: 3, required: false }
    ]
  },
  {
    name: 'clear',
    description: 'Löscht 1 bis 100 Nachrichten.',
    options: [{ name: 'anzahl', description: 'Anzahl der Nachrichten.', type: 4, required: true, min_value: 1, max_value: 100 }]
  },
  {
    name: 'kick',
    description: 'Kickt einen Benutzer.',
    options: [
      { name: 'user', description: 'Benutzer.', type: 6, required: true },
      { name: 'grund', description: 'Grund.', type: 3, required: false }
    ]
  },
  {
    name: 'ban',
    description: 'Bannt einen Benutzer.',
    options: [
      { name: 'user', description: 'Benutzer.', type: 6, required: true },
      { name: 'grund', description: 'Grund.', type: 3, required: false }
    ]
  },
  {
    name: 'unban',
    description: 'Entbannt einen Benutzer.',
    options: [{ name: 'userid', description: 'Discord-ID.', type: 3, required: true }]
  },
  {
    name: 'timeout',
    description: 'Gibt einem Benutzer einen Timeout.',
    options: [
      { name: 'user', description: 'Benutzer.', type: 6, required: true },
      { name: 'minuten', description: 'Dauer in Minuten.', type: 4, required: true, min_value: 1, max_value: 40320 },
      { name: 'grund', description: 'Grund.', type: 3, required: false }
    ]
  },
  {
    name: 'untimeout',
    description: 'Entfernt einen Timeout.',
    options: [{ name: 'user', description: 'Benutzer.', type: 6, required: true }]
  },
  {
    name: 'userinfo',
    description: 'Zeigt Benutzerinformationen.',
    options: [{ name: 'user', description: 'Benutzer (optional).', type: 6, required: false }]
  },
  {
    name: 'avatar',
    description: 'Zeigt das Profilbild.',
    options: [{ name: 'user', description: 'Benutzer (optional).', type: 6, required: false }]
  },
  { name: 'serverinfo', description: 'Zeigt Serverinformationen.' },
  {
    name: 'say',
    description: 'Sendet normalen Text.',
    options: [{ name: 'text', description: 'Text.', type: 3, required: true }]
  },
  {
    name: 'announce',
    description: 'Sendet eine Ankündigung als Embed.',
    options: [{ name: 'text', description: 'Ankündigung.', type: 3, required: true }]
  },
  {
    name: 'slowmode',
    description: 'Setzt den Slowmode.',
    options: [{ name: 'sekunden', description: '0 bis 21600 Sekunden.', type: 4, required: true, min_value: 0, max_value: 21600 }]
  },
  { name: 'lock', description: 'Sperrt den aktuellen Channel.' },
  { name: 'unlock', description: 'Entsperrt den aktuellen Channel.' },
  {
    name: 'poll',
    description: 'Erstellt eine Umfrage.',
    options: [
      { name: 'frage', description: 'Frage.', type: 3, required: true },
      { name: 'option1', description: 'Option 1.', type: 3, required: true },
      { name: 'option2', description: 'Option 2.', type: 3, required: true },
      { name: 'option3', description: 'Option 3.', type: 3, required: false },
      { name: 'option4', description: 'Option 4.', type: 3, required: false },
      { name: 'option5', description: 'Option 5.', type: 3, required: false }
    ]
  },
  {
    name: 'dm',
    description: 'Sendet einem Benutzer eine DM.',
    options: [
      { name: 'user', description: 'Benutzer.', type: 6, required: true },
      { name: 'text', description: 'Nachricht.', type: 3, required: true }
    ]
  },
  {
    name: 'nick',
    description: 'Ändert den Nickname.',
    options: [
      { name: 'user', description: 'Benutzer.', type: 6, required: true },
      { name: 'name', description: 'Neuer Nickname.', type: 3, required: true }
    ]
  },
  {
    name: 'givewaystart',
    description: 'Startet ein Giveaway.',
    options: [
      { name: 'preis', description: 'Was kann man gewinnen?', type: 3, required: true },
      { name: 'dauer', description: 'z.B. 30m, 2h, 1d.', type: 3, required: true },
      { name: 'gewinner', description: 'Anzahl der Gewinner.', type: 4, required: true, min_value: 1, max_value: 20 }
    ]
  },
  {
    name: 'givewayend',
    description: 'Beendet ein Giveaway vorzeitig.',
    options: [{ name: 'givewayid', description: 'Giveaway-ID.', type: 3, required: true }]
  },
  {
    name: 'reroll',
    description: 'Lost Gewinner eines Giveaways neu aus.',
    options: [
      { name: 'givewayid', description: 'Giveaway-ID.', type: 3, required: true },
      { name: 'anzahl', description: 'Anzahl neuer Gewinner.', type: 4, required: true, min_value: 1, max_value: 20 }
    ]
  }
];

function replyError(interaction, text) {
  return interaction.reply({ content: `❌ ${text}`, ephemeral: true });
}

function hasAccess(interaction, commandName) {
  if (interaction.user.id === OWNER_ID) return true;
  const roleId = commandRoles.get(`${interaction.guildId}:${commandName}`);
  return Boolean(roleId && interaction.member?.roles?.cache?.has(roleId));
}

function parseColor(value) {
  const input = value || '#5865F2';
  if (!/^#?[0-9a-fA-F]{6}$/.test(input)) return null;
  return input.startsWith('#') ? input : `#${input}`;
}

function canModerate(interaction, target) {
  if (!target) return false;
  if (target.id === interaction.user.id || target.id === client.user.id) return false;
  return interaction.member.roles.highest.position > target.roles.highest.position;
}

function parseDuration(value) {
  const match = /^(\d+)\s*(s|m|h|d|w)$/i.exec(value.trim());
  if (!match) return null;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  const ms = Number(match[1]) * units[match[2].toLowerCase()];
  if (!Number.isFinite(ms) || ms < 1000 || ms > 28 * 86400000) return null;
  return ms;
}

function makeGiveawayId() {
  return `GW-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function giveawayButton(id, ended = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway:${id}`)
      .setLabel(ended ? 'Giveaway beendet' : '🎉 Beitreten')
      .setStyle(ended ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(ended)
  );
}

function randomWinners(entries, count) {
  const pool = [...entries];
  const winners = [];
  while (pool.length && winners.length < count) {
    winners.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return winners;
}

async function finishGiveaway(giveaway) {
  if (!giveaway || giveaway.ended) return [];
  giveaway.ended = true;
  if (giveaway.timer) clearTimeout(giveaway.timer);

  const winners = randomWinners(giveaway.entries, giveaway.winnerCount);
  giveaway.winnerIds = winners;

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel) return winners;
  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);

  const winnerText = winners.length ? winners.map(id => `<@${id}>`).join(', ') : 'Keine Teilnehmer';
  const oldEmbed = message?.embeds?.[0];
  const endedEmbed = oldEmbed
    ? EmbedBuilder.from(oldEmbed)
        .setTitle('🎉 Giveaway beendet!')
        .setDescription(`**Preis:** ${giveaway.prize}\n**Gewinner:** ${winnerText}\n\n**Giveaway-ID:** \`${giveaway.id}\``)
        .setColor('#ED4245')
    : new EmbedBuilder()
        .setTitle('🎉 Giveaway beendet!')
        .setDescription(`**Preis:** ${giveaway.prize}\n**Gewinner:** ${winnerText}\n\n**Giveaway-ID:** \`${giveaway.id}\``)
        .setColor('#ED4245');

  if (message) {
    await message.edit({ embeds: [endedEmbed], components: [giveawayButton(giveaway.id, true)] }).catch(() => {});
  }

  if (winners.length) {
    await channel.send(`🎉 Glückwunsch ${winnerText}! Ihr habt **${giveaway.prize}** gewonnen.\nGiveaway-ID: \`${giveaway.id}\``).catch(() => {});
  } else {
    await channel.send(`❌ Giveaway **${giveaway.id}** wurde beendet. Es gab keine Teilnehmer.`).catch(() => {});
  }
  return winners;
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  for (const guild of client.guilds.cache.values()) {
    await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: commands });
    console.log(`Commands registriert: ${guild.name}`);
  }
}

client.once('ready', async () => {
  console.log(`Bot online als ${client.user.tag}`);
  try {
    await registerCommands();
    console.log('Alle Slash-Commands wurden neu registriert.');
  } catch (error) {
    console.error('Fehler bei der Command-Registrierung:', error);
  }
});

client.on('guildCreate', async guild => {
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: commands });
  } catch (error) {
    console.error('Fehler bei neuem Server:', error);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const name = interaction.commandName;

      if (name === 'setup') {
        if (interaction.user.id !== OWNER_ID) return replyError(interaction, 'Du darfst `/setup` nicht benutzen.');

        const options = commands
          .filter(command => command.name !== 'setup')
          .map(command => ({
            label: `/${command.name}`.slice(0, 100),
            value: command.name,
            description: command.description.slice(0, 100)
          }));

        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('⚙️ Bot Setup').setDescription('Wähle einen Command aus und danach die Rolle, die ihn benutzen darf.').setColor('#5865F2')],
          components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('setup:command').setPlaceholder('Command auswählen ...').addOptions(options))],
          ephemeral: true
        });
      }

      if (!hasAccess(interaction, name)) {
        return replyError(interaction, 'Dieser Command wurde noch nicht eingerichtet oder du hast nicht die passende Rolle.');
      }

      if (name === 'nachricht') {
        const text = interaction.options.getString('text', true);
        const image = interaction.options.getString('bild');
        const color = parseColor(interaction.options.getString('farbe'));
        if (!color) return replyError(interaction, 'Ungültige HEX-Farbe. Beispiel: `#ff0000`.');

        const embed = new EmbedBuilder().setDescription(text).setColor(color).setTimestamp();
        if (image) {
          try { new URL(image); embed.setImage(image); }
          catch { return replyError(interaction, 'Die Bild-URL ist ungültig.'); }
        }
        await interaction.channel.send({ embeds: [embed] });
        return interaction.reply({ content: '✅ Nachricht gesendet.', ephemeral: true });
      }

      if (name === 'ausnach') {
        const main = interaction.options.getString('nachricht', true);
        const options = [];
        for (let n = 1; n <= 5; n++) {
          const label = interaction.options.getString(`option${n}`);
          const response = interaction.options.getString(`option${n}interaktion`);
          if ((label && !response) || (!label && response)) return replyError(interaction, `Option ${n} muss aus beiden Feldern bestehen.`);
          if (label && response) options.push({ number: n, label, response });
        }

        const id = `ausnach:${interaction.user.id}:${Date.now()}`;
        const menu = new StringSelectMenuBuilder()
          .setCustomId(id)
          .setPlaceholder('Option auswählen ...')
          .addOptions(options.map(option => ({ label: option.label.slice(0, 100), value: String(option.number), description: 'Antwort anzeigen' })));

        await interaction.channel.send({
          embeds: [new EmbedBuilder().setDescription(main).setColor('#5865F2')],
          components: [new ActionRowBuilder().addComponents(menu)]
        });
        ausnachData.set(id, options);
        return interaction.reply({ content: '✅ Auswahl-Nachricht gesendet.', ephemeral: true });
      }

      if (name === 'clear') {
        if (!interaction.channel?.isTextBased()) return replyError(interaction, 'Dieser Channel unterstützt das nicht.');
        const amount = interaction.options.getInteger('anzahl', true);
        const deleted = await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({ content: `🧹 ${deleted.size} Nachrichten gelöscht.`, ephemeral: true });
      }

      if (name === 'kick' || name === 'ban') {
        const target = interaction.options.getMember('user');
        if (!canModerate(interaction, target)) return replyError(interaction, 'Dieser Benutzer kann von dir nicht moderiert werden.');
        const reason = interaction.options.getString('grund') || 'Kein Grund angegeben';
        if (name === 'kick') await target.kick(reason); else await target.ban({ reason });
        return interaction.reply({ content: `✅ ${target.user.tag} wurde ${name === 'kick' ? 'gekickt' : 'gebannt'}.`, ephemeral: true });
      }

      if (name === 'unban') {
        const id = interaction.options.getString('userid', true);
        await interaction.guild.members.unban(id);
        return interaction.reply({ content: `✅ Benutzer **${id}** wurde entbannt.`, ephemeral: true });
      }

      if (name === 'timeout' || name === 'untimeout') {
        const target = interaction.options.getMember('user');
        if (!canModerate(interaction, target)) return replyError(interaction, 'Dieser Benutzer kann von dir nicht moderiert werden.');
        if (name === 'timeout') {
          const minutes = interaction.options.getInteger('minuten', true);
          const reason = interaction.options.getString('grund') || 'Kein Grund angegeben';
          await target.timeout(minutes * 60000, reason);
          return interaction.reply({ content: `✅ ${target.user.tag} hat einen Timeout für ${minutes} Minuten erhalten.`, ephemeral: true });
        }
        await target.timeout(null);
        return interaction.reply({ content: `✅ Timeout von ${target.user.tag} entfernt.`, ephemeral: true });
      }

      if (name === 'userinfo') {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        const embed = new EmbedBuilder()
          .setTitle(`👤 ${user.tag}`)
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: 'ID', value: user.id },
            { name: 'Account erstellt', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` },
            { name: 'Serverbeitritt', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Unbekannt' }
          )
          .setColor('#5865F2');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (name === 'avatar') {
        const user = interaction.options.getUser('user') || interaction.user;
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🖼️ Avatar von ${user.tag}`).setImage(user.displayAvatarURL({ size: 1024, extension: 'png' })).setColor('#5865F2')] });
      }

      if (name === 'serverinfo') {
        const guild = interaction.guild;
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🏠 ${guild.name}`).setThumbnail(guild.iconURL({ size: 256 }) || null).addFields(
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Mitglieder', value: String(guild.memberCount), inline: true },
          { name: 'Channels', value: String(guild.channels.cache.size), inline: true },
          { name: 'Rollen', value: String(guild.roles.cache.size), inline: true }
        ).setColor('#5865F2')] });
      }

      if (name === 'say') {
        await interaction.channel.send(interaction.options.getString('text', true));
        return interaction.reply({ content: '✅ Gesendet.', ephemeral: true });
      }

      if (name === 'announce') {
        await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('📢 Ankündigung').setDescription(interaction.options.getString('text', true)).setColor('#5865F2').setTimestamp()] });
        return interaction.reply({ content: '✅ Ankündigung gesendet.', ephemeral: true });
      }

      if (name === 'slowmode') {
        const seconds = interaction.options.getInteger('sekunden', true);
        await interaction.channel.setRateLimitPerUser(seconds);
        return interaction.reply({ content: `✅ Slowmode auf **${seconds} Sekunden** gesetzt.`, ephemeral: true });
      }

      if (name === 'lock' || name === 'unlock') {
        const locked = name === 'lock';
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: locked ? false : null });
        return interaction.reply({ content: locked ? '🔒 Channel gesperrt.' : '🔓 Channel entsperrt.', ephemeral: true });
      }

      if (name === 'poll') {
        const question = interaction.options.getString('frage', true);
        const options = [];
        for (let n = 1; n <= 5; n++) {
          const option = interaction.options.getString(`option${n}`);
          if (option) options.push(option);
        }
        const emojis = ['🇦', '🇧', '🇨', '🇩', '🇪'];
        const embed = new EmbedBuilder().setTitle('📊 Umfrage').setDescription(`**${question}**\n\n${options.map((x, i) => `${emojis[i]} ${x}`).join('\n')}`).setColor('#5865F2');
        const message = await interaction.channel.send({ embeds: [embed] });
        for (let i = 0; i < options.length; i++) await message.react(emojis[i]);
        return interaction.reply({ content: '✅ Umfrage erstellt.', ephemeral: true });
      }

      if (name === 'dm') {
        const user = interaction.options.getUser('user', true);
        await user.send(interaction.options.getString('text', true));
        return interaction.reply({ content: `✅ DM an ${user.tag} gesendet.`, ephemeral: true });
      }

      if (name === 'nick') {
        const target = interaction.options.getMember('user');
        if (!canModerate(interaction, target)) return replyError(interaction, 'Dieser Benutzer kann von dir nicht geändert werden.');
        await target.setNickname(interaction.options.getString('name', true));
        return interaction.reply({ content: `✅ Nickname von ${target.user.tag} geändert.`, ephemeral: true });
      }

      if (name === 'givewaystart') {
        const prize = interaction.options.getString('preis', true);
        const durationText = interaction.options.getString('dauer', true);
        const winnerCount = interaction.options.getInteger('gewinner', true);
        const duration = parseDuration(durationText);
        if (!duration) return replyError(interaction, 'Ungültige Dauer. Beispiele: `30m`, `2h`, `1d`, `1w`. Maximum: 28 Tage.');

        const id = makeGiveawayId();
        const endsAt = Date.now() + duration;
        const giveaway = {
          id,
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          messageId: null,
          creatorId: interaction.user.id,
          prize,
          winnerCount,
          endsAt,
          entries: new Set(),
          winnerIds: [],
          ended: false,
          timer: null
        };

        const embed = new EmbedBuilder()
          .setTitle('🎉 GIVEAWAY')
          .setDescription(`**Preis:** ${prize}\n**Gewinner:** ${winnerCount}\n**Endet:** <t:${Math.floor(endsAt / 1000)}:R>\n\nKlicke auf **Beitreten**, um teilzunehmen!\n\n**Giveaway-ID:** \`${id}\``)
          .setColor('#57F287')
          .setTimestamp();

        const message = await interaction.channel.send({ embeds: [embed], components: [giveawayButton(id)] });
        giveaway.messageId = message.id;
        giveaway.timer = setTimeout(() => finishGiveaway(giveaway), duration);
        giveaways.set(id, giveaway);

        return interaction.reply({ content: `✅ Giveaway erstellt. Deine ID: **${id}**`, ephemeral: true });
      }

      if (name === 'givewayend') {
        const id = interaction.options.getString('givewayid', true);
        const giveaway = giveaways.get(id);
        if (!giveaway) return replyError(interaction, 'Giveaway-ID nicht gefunden. Hinweis: Giveaways werden ohne Datenbank bei Bot-Neustart zurückgesetzt.');
        if (giveaway.guildId !== interaction.guildId) return replyError(interaction, 'Dieses Giveaway gehört zu einem anderen Server.');
        if (giveaway.ended) return replyError(interaction, 'Dieses Giveaway ist bereits beendet.');
        if (giveaway.creatorId !== interaction.user.id && interaction.user.id !== OWNER_ID) return replyError(interaction, 'Nur der Ersteller oder Bot-Owner darf dieses Giveaway beenden.');
        await finishGiveaway(giveaway);
        return interaction.reply({ content: `✅ Giveaway **${id}** wurde beendet.`, ephemeral: true });
      }

      if (name === 'reroll') {
        const id = interaction.options.getString('givewayid', true);
        const count = interaction.options.getInteger('anzahl', true);
        const giveaway = giveaways.get(id);
        if (!giveaway) return replyError(interaction, 'Giveaway-ID nicht gefunden.');
        if (!giveaway.ended) return replyError(interaction, 'Das Giveaway muss zuerst beendet werden.');
        if (giveaway.creatorId !== interaction.user.id && interaction.user.id !== OWNER_ID) return replyError(interaction, 'Nur der Ersteller oder Bot-Owner darf einen Reroll machen.');

        const available = [...giveaway.entries].filter(id => !giveaway.winnerIds.includes(id));
        const winners = randomWinners(available, count);
        if (!winners.length) return replyError(interaction, 'Es gibt keine weiteren Teilnehmer für einen Reroll.');
        giveaway.winnerIds.push(...winners);
        await interaction.reply({ content: `🎉 Reroll für **${id}**: ${winners.map(userId => `<@${userId}>`).join(', ')}` });
        await interaction.channel.send(`🎉 Neue Gewinner des Giveaways **${id}**: ${winners.map(userId => `<@${userId}>`).join(', ')}!`).catch(() => {});
        return;
      }
    }

    if (interaction.isButton() && interaction.customId.startsWith('giveaway:')) {
      const id = interaction.customId.slice('giveaway:'.length);
      const giveaway = giveaways.get(id);
      if (!giveaway || giveaway.ended) return replyError(interaction, 'Dieses Giveaway ist bereits beendet.');

      if (giveaway.entries.has(interaction.user.id)) {
        giveaway.entries.delete(interaction.user.id);
        return interaction.reply({ content: '🚪 Du hast das Giveaway verlassen.', ephemeral: true });
      }

      giveaway.entries.add(interaction.user.id);
      return interaction.reply({ content: '🎉 Du bist jetzt beim Giveaway dabei! Drücke den Button erneut, um es zu verlassen.', ephemeral: true });
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'setup:command') {
        if (interaction.user.id !== OWNER_ID) return replyError(interaction, 'Du darfst das Setup nicht benutzen.');
        const commandName = interaction.values[0];
        const roles = interaction.guild.roles.cache
          .filter(role => role.id !== interaction.guild.id && !role.managed)
          .sort((a, b) => b.position - a.position)
          .first(25);

        if (!roles.length) return interaction.update({ content: '❌ Keine Rollen gefunden.', embeds: [], components: [] });

        const menu = new StringSelectMenuBuilder()
          .setCustomId(`setup:role:${commandName}`)
          .setPlaceholder('Rolle auswählen ...')
          .addOptions(roles.map(role => ({ label: role.name.slice(0, 100), value: role.id, description: `Darf /${commandName} benutzen` })));

        return interaction.update({
          content: `⚙️ Welche Rolle darf **/${commandName}** benutzen?`,
          embeds: [],
          components: [new ActionRowBuilder().addComponents(menu)]
        });
      }

      if (interaction.customId.startsWith('setup:role:')) {
        if (interaction.user.id !== OWNER_ID) return replyError(interaction, 'Du darfst das Setup nicht benutzen.');
        const commandName = interaction.customId.slice('setup:role:'.length);
        const roleId = interaction.values[0];
        commandRoles.set(`${interaction.guildId}:${commandName}`, roleId);
        return interaction.update({
          content: `✅ **/${commandName}** ist jetzt für <@&${roleId}> freigeschaltet.`,
          embeds: [],
          components: []
        });
      }

      const options = ausnachData.get(interaction.customId);
      if (options) {
        const selected = options.find(option => String(option.number) === interaction.values[0]);
        return interaction.reply({ content: selected?.response || '❌ Antwort nicht gefunden.', ephemeral: true });
      }
    }
  } catch (error) {
    console.error('Interaction-Fehler:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Es ist ein Fehler aufgetreten. Prüfe die Bot-Konsole.', ephemeral: true }).catch(() => {});
    }
  }
});

client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.find(ch => ch.name.toLowerCase() === 'willkommen' && ch.isTextBased());
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('👋 Willkommen!')
    .setDescription(`Willkommen ${member} auf **${member.guild.name}**!\n\nWir freuen uns, dass du da bist.`)
    .addFields(
      { name: '👤 Benutzer', value: member.user.tag, inline: true },
      { name: '👥 Mitglieder', value: String(member.guild.memberCount), inline: true }
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setColor('#57F287')
    .setFooter({ text: `Willkommen bei ${member.guild.name}` })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(error => console.error('Willkommensfehler:', error));
});

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN fehlt in der .env-Datei.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
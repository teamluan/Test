require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const commandRoles = new Map();
const SETUP_USER_ID = '1177592138968604675';
const ausnachResponses = new Map();
const giveaways = new Map();
let giveawayCounter = 0;

const commands = [
{name:'setup',description:'Bot-Commands und Rollen verwalten.'},
{name:'nachricht',description:'Embed-Nachricht senden.',options:[{name:'text',description:'Text',type:3,required:true},{name:'bild',description:'Bild-URL',type:3,required:false},{name:'farbe',description:'HEX-Farbe',type:3,required:false}]},
{name:'ausnach',description:'Auswahl-Nachricht erstellen.',options:[{name:'nachricht',description:'Hauptnachricht',type:3,required:true},{name:'option1',description:'Option 1',type:3,required:true},{name:'option1interaktion',description:'Antwort 1',type:3,required:true},{name:'option2',description:'Option 2',type:3,required:false},{name:'option2interaktion',description:'Antwort 2',type:3,required:false},{name:'option3',description:'Option 3',type:3,required:false},{name:'option3interaktion',description:'Antwort 3',type:3,required:false},{name:'option4',description:'Option 4',type:3,required:false},{name:'option4interaktion',description:'Antwort 4',type:3,required:false},{name:'option5',description:'Option 5',type:3,required:false},{name:'option5interaktion',description:'Antwort 5',type:3,required:false}]},
{name:'clear',description:'Nachrichten löschen.',options:[{name:'anzahl',description:'1-100',type:4,required:true,min_value:1,max_value:100}]},
{name:'kick',description:'Benutzer kicken.',options:[{name:'user',description:'Benutzer',type:6,required:true},{name:'grund',description:'Grund',type:3,required:false}]},
{name:'ban',description:'Benutzer bannen.',options:[{name:'user',description:'Benutzer',type:6,required:true},{name:'grund',description:'Grund',type:3,required:false}]},
{name:'unban',description:'Benutzer entbannen.',options:[{name:'userid',description:'Benutzer-ID',type:3,required:true}]},
{name:'timeout',description:'Benutzer timeouten.',options:[{name:'user',description:'Benutzer',type:6,required:true},{name:'minuten',description:'Minuten',type:4,required:true,min_value:1,max_value:40320},{name:'grund',description:'Grund',type:3,required:false}]},
{name:'untimeout',description:'Timeout entfernen.',options:[{name:'user',description:'Benutzer',type:6,required:true}]},
{name:'userinfo',description:'Benutzerinformationen.',options:[{name:'user',description:'Benutzer',type:6,required:false}]},
{name:'avatar',description:'Profilbild anzeigen.',options:[{name:'user',description:'Benutzer',type:6,required:false}]},
{name:'serverinfo',description:'Serverinformationen.'},
{name:'say',description:'Bot sendet Text.',options:[{name:'text',description:'Text',type:3,required:true}]},
{name:'announce',description:'Ankündigung als Embed.',options:[{name:'text',description:'Text',type:3,required:true}]},
{name:'slowmode',description:'Slowmode einstellen.',options:[{name:'sekunden',description:'0-21600 Sekunden',type:4,required:true,min_value:0,max_value:21600}]},
{name:'lock',description:'Channel sperren.'},
{name:'unlock',description:'Channel entsperren.'},
{name:'poll',description:'Umfrage erstellen.',options:[{name:'frage',description:'Frage',type:3,required:true},{name:'option1',description:'Option 1',type:3,required:true},{name:'option2',description:'Option 2',type:3,required:true},{name:'option3',description:'Option 3',type:3,required:false},{name:'option4',description:'Option 4',type:3,required:false},{name:'option5',description:'Option 5',type:3,required:false}]},
{name:'dm',description:'DM an Benutzer senden.',options:[{name:'user',description:'Benutzer',type:6,required:true},{name:'text',description:'Text',type:3,required:true}]},
{name:'nick',description:'Nickname ändern.',options:[{name:'user',description:'Benutzer',type:6,required:true},{name:'name',description:'Neuer Name',type:3,required:true}]},
{name:'giveway',description:'Giveaway starten oder vorzeitig beenden.',options:[
  {type:1,name:'start',description:'Giveaway starten.',options:[
    {name:'preis',description:'Was kann man gewinnen?',type:3,required:true},
    {name:'dauer',description:'z.B. 30m, 2h, 1d',type:3,required:true},
    {name:'gewinner',description:'Anzahl der Gewinner',type:4,required:true,min_value:1,max_value:20}
  ]},
  {type:1,name:'end',description:'Giveaway vorzeitig beenden.',options:[{name:'givewayid',description:'ID des Giveaways',type:3,required:true}]}
]},
{name:'reroll',description:'Gewinner eines Giveaways neu auslosen.',options:[{name:'givewayid',description:'ID des Giveaways',type:3,required:true},{name:'anzahl',description:'Wie viele neu auslosen?',type:4,required:true,min_value:1,max_value:20}]}
];

function hasAccess(i,c){if(i.user.id===SETUP_USER_ID)return true;const r=commandRoles.get(`${i.guildId}:${c}`);return !!r&&!!i.member?.roles?.cache?.has(r)}
function color(v){v=v||'#5865F2';return /^#?[0-9A-Fa-f]{6}$/.test(v)?(v.startsWith('#')?v:`#${v}`):null}
function canMod(i,t){return t&&t.id!==i.user.id&&t.id!==client.user.id&&i.member.roles.highest.position>t.roles.highest.position}
function parseDuration(value){const m=/^(\d+)\s*(s|m|h|d|w)$/i.exec(value.trim());if(!m)return null;const n=Number(m[1]);const units={s:1000,m:60000,h:3600000,d:86400000,w:604800000};const ms=n*units[m[2].toLowerCase()];if(!Number.isFinite(ms)||ms<1000||ms>28*86400000)return null;return ms}
function giveawayId(guildId){giveawayCounter++;return `GW-${Date.now().toString(36).toUpperCase()}-${giveawayCounter}`}
function giveawayRow(id,ended=false){return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_join:${id}`).setLabel(ended?'Giveaway beendet':'🎉 Beitreten').setStyle(ended?ButtonStyle.Secondary:ButtonStyle.Success).setDisabled(ended))}
function winnersFrom(g){const arr=[...g.entries];const out=[];while(arr.length&&out.length<g.winners){out.push(arr.splice(Math.floor(Math.random()*arr.length),1)[0])}return out}
async function finishGiveaway(g,manual=false){if(!g||g.ended)return null;g.ended=true;if(g.timer)clearTimeout(g.timer);const winners=winnersFrom(g);g.winnerIds=winners;const channel=await client.channels.fetch(g.channelId).catch(()=>null);if(!channel)return winners;const msg=await channel.messages.fetch(g.messageId).catch(()=>null);if(msg)await msg.edit({embeds:[EmbedBuilder.from(msg.embeds[0]).setTitle('🎉 Giveaway beendet!').setDescription(`**Preis:** ${g.prize}\n**Gewinner:** ${winners.length? winners.map(id=>`<@${id}>`).join(', '):'Keine Teilnehmer'}\n\nGiveaway-ID: \`${g.id}\``).setColor('#ED4245')],components:[giveawayRow(g.id,true)]}).catch(()=>{});if(winners.length)await channel.send(`🎉 Glückwunsch ${winners.map(id=>`<@${id}>`).join(', ')}! Ihr habt **${g.prize}** gewonnen. Giveaway-ID: \`${g.id}\``).catch(()=>{});else await channel.send(`❌ Das Giveaway **${g.id}** ist beendet, es gab keine Teilnehmer.`).catch(()=>{});return winners}

client.once('ready',async()=>{const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);try{await rest.put(Routes.applicationCommands(client.user.id),{body:commands});console.log(`Bot online als ${client.user.tag}`)}catch(e){console.error(e)}});

client.on('interactionCreate',async i=>{try{
if(i.isChatInputCommand()){
if(i.commandName==='setup'){if(i.user.id!==SETUP_USER_ID)return i.reply({content:'❌ Kein Zugriff.',ephemeral:true});const menu=new StringSelectMenuBuilder().setCustomId('setup_command').setPlaceholder('Command auswählen ...').addOptions(commands.filter(c=>c.name!=='setup').map(c=>({label:`/${c.name}`.slice(0,100),value:c.name,description:c.description.slice(0,100)})));return i.reply({embeds:[new EmbedBuilder().setTitle('⚙️ Bot Setup').setDescription('Command auswählen und danach Rolle festlegen.').setColor('#5865F2')],components:[new ActionRowBuilder().addComponents(menu)],ephemeral:true})}
if(!hasAccess(i,i.commandName))return i.reply({content:'❌ Command nicht eingerichtet oder keine passende Rolle.',ephemeral:true});
if(i.commandName==='giveway'){
 const sub=i.options.getSubcommand();
 if(sub==='start'){
  const prize=i.options.getString('preis',true),duration=i.options.getString('dauer',true),winnerCount=i.options.getInteger('gewinner',true),ms=parseDuration(duration);
  if(!ms)return i.reply({content:'❌ Ungültige Dauer. Beispiele: `30m`, `2h`, `1d`, `1w`. Maximum ist 28 Tage.',ephemeral:true});
  const id=giveawayId(i.guildId),endsAt=Date.now()+ms;const g={id,guildId:i.guildId,channelId:i.channelId,messageId:null,creatorId:i.user.id,prize,winners:winnerCount,endsAt,entries:new Set(),ended:false,winnerIds:[]};
  const embed=new EmbedBuilder().setTitle('🎉 GIVEAWAY').setDescription(`**Preis:** ${prize}\n\n**Gewinner:** ${winnerCount}\n**Endet:** <t:${Math.floor(endsAt/1000)}:R>\n\n🎉 Klicke auf **Beitreten**, um teilzunehmen!\n\n**Giveaway-ID:** \`${id}\``).setColor('#57F287').setFooter({text:`Gestartet von ${i.user.tag}`}).setTimestamp();
  const msg=await i.channel.send({embeds:[embed],components:[giveawayRow(id)]});g.messageId=msg.id;giveaways.set(id,g);g.timer=setTimeout(()=>finishGiveaway(g),ms);return i.reply({content:`✅ Giveaway erstellt! Deine Giveaway-ID ist **${id}**.`,ephemeral:true});
 }
 const id=i.options.getString('givewayid',true),g=giveaways.get(id);if(!g)return i.reply({content:'❌ Giveaway-ID nicht gefunden.',ephemeral:true});if(g.guildId!==i.guildId)return i.reply({content:'❌ Dieses Giveaway gehört zu einem anderen Server.',ephemeral:true});if(g.ended)return i.reply({content:'❌ Dieses Giveaway ist bereits beendet.',ephemeral:true});if(g.creatorId!==i.user.id&&i.user.id!==SETUP_USER_ID)return i.reply({content:'❌ Nur der Ersteller des Giveaways oder der Bot-Owner darf es beenden.',ephemeral:true});await finishGiveaway(g,true);return i.reply({content:`✅ Giveaway **${id}** wurde vorzeitig beendet.`,ephemeral:true});
}
if(i.commandName==='reroll'){
 const id=i.options.getString('givewayid',true),count=i.options.getInteger('anzahl',true),g=giveaways.get(id);if(!g)return i.reply({content:'❌ Giveaway-ID nicht gefunden.',ephemeral:true});if(!g.ended)return i.reply({content:'❌ Das Giveaway muss zuerst beendet sein.',ephemeral:true});const pool=[...g.entries].filter(x=>!g.winnerIds.includes(x));if(!pool.length)return i.reply({content:'❌ Es gibt keine weiteren Teilnehmer zum Rerollen.',ephemeral:true});const winners=[];while(pool.length&&winners.length<count)winners.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);g.winnerIds.push(...winners);await i.reply({content:`🎉 Neue Gewinner für **${id}**: ${winners.map(x=>`<@${x}>`).join(', ')}`});return i.channel.send(`🎉 Reroll für Giveaway **${id}**: ${winners.map(x=>`<@${x}>`).join(', ')} haben gewonnen!`)}
if(i.commandName==='nachricht'){const t=i.options.getString('text',true),b=i.options.getString('bild'),co=color(i.options.getString('farbe'));if(!co)return i.reply({content:'❌ Ungültige HEX-Farbe.',ephemeral:true});const e=new EmbedBuilder().setDescription(t).setColor(co);if(b){try{new URL(b);e.setImage(b)}catch{return i.reply({content:'❌ Ungültige Bild-URL.',ephemeral:true})}}await i.channel.send({embeds:[e]});return i.reply({content:'✅ Gesendet.',ephemeral:true})}
if(i.commandName==='ausnach'){const main=i.options.getString('nachricht',true),o=[];for(let n=1;n<=5;n++){const l=i.options.getString(`option${n}`),r=i.options.getString(`option${n}interaktion`);if((l&&!r)||(!l&&r))return i.reply({content:`❌ Option ${n} unvollständig.`,ephemeral:true});if(l&&r)o.push({number:n,label:l,response:r})}const id=`ausnach_${i.user.id}_${Date.now()}`,m=new StringSelectMenuBuilder().setCustomId(id).setPlaceholder('Option auswählen ...').addOptions(o.map(x=>({label:x.label.slice(0,100),value:String(x.number),description:'Interaktion anzeigen'})));await i.channel.send({embeds:[new EmbedBuilder().setDescription(main).setColor('#5865F2')],components:[new ActionRowBuilder().addComponents(m)]});ausnachResponses.set(id,o);return i.reply({content:'✅ Gesendet.',ephemeral:true})}
if(i.commandName==='clear'){const n=i.options.getInteger('anzahl',true),d=await i.channel.bulkDelete(n,true);return i.reply({content:`🧹 ${d.size} Nachrichten gelöscht.`,ephemeral:true})}
if(i.commandName==='kick'||i.commandName==='ban'){const t=i.options.getMember('user'),g=i.options.getString('grund')||'Kein Grund angegeben';if(!canMod(i,t))return i.reply({content:'❌ Dieser Benutzer kann nicht moderiert werden.',ephemeral:true});if(i.commandName==='kick')await t.kick(g);else await t.ban({reason:g});return i.reply({content:`✅ ${t.user.tag} wurde ${i.commandName==='kick'?'gekickt':'gebannt'}.`,ephemeral:true})}
if(i.commandName==='unban'){const id=i.options.getString('userid',true);await i.guild.members.unban(id);return i.reply({content:'✅ Benutzer entbannt.',ephemeral:true})}
if(i.commandName==='timeout'||i.commandName==='untimeout'){const t=i.options.getMember('user');if(!canMod(i,t))return i.reply({content:'❌ Nicht möglich.',ephemeral:true});if(i.commandName==='timeout'){const m=i.options.getInteger('minuten',true);await t.timeout(m*60000,i.options.getString('grund')||'Kein Grund');return i.reply({content:`✅ Timeout für ${m} Minuten.`,ephemeral:true})}await t.timeout(null);return i.reply({content:'✅ Timeout entfernt.',ephemeral:true})}
if(i.commandName==='userinfo'){const u=i.options.getUser('user')||i.user,m=i.guild.members.cache.get(u.id);return i.reply({embeds:[new EmbedBuilder().setTitle(`👤 ${u.tag}`).setThumbnail(u.displayAvatarURL({size:256})).addFields({name:'ID',value:u.id},{name:'Account',value:`<t:${Math.floor(u.createdTimestamp/1000)}:F>`},{name:'Serverbeitritt',value:m?`<t:${Math.floor(m.joinedTimestamp/1000)}:F>`:'Unbekannt'}).setColor('#5865F2')],ephemeral:true})}
if(i.commandName==='avatar'){const u=i.options.getUser('user')||i.user;return i.reply({embeds:[new EmbedBuilder().setTitle(`🖼️ Avatar von ${u.tag}`).setImage(u.displayAvatarURL({size:1024,dynamic:true})).setColor('#5865F2')]})}
if(i.commandName==='serverinfo'){const g=i.guild;return i.reply({embeds:[new EmbedBuilder().setTitle(`🏠 ${g.name}`).addFields({name:'Owner',value:`<@${g.ownerId}>`,inline:true},{name:'Mitglieder',value:String(g.memberCount),inline:true},{name:'Channels',value:String(g.channels.cache.size),inline:true},{name:'Rollen',value:String(g.roles.cache.size),inline:true}).setColor('#5865F2')]})}
if(i.commandName==='say'){await i.channel.send(i.options.getString('text',true));return i.reply({content:'✅ Gesendet.',ephemeral:true})}
if(i.commandName==='announce'){await i.channel.send({embeds:[new EmbedBuilder().setTitle('📢 Ankündigung').setDescription(i.options.getString('text',true)).setColor('#5865F2')]});return i.reply({content:'✅ Gesendet.',ephemeral:true})}
if(i.commandName==='slowmode'){const s=i.options.getInteger('sekunden',true);await i.channel.setRateLimitPerUser(s);return i.reply({content:`✅ Slowmode: ${s}s`,ephemeral:true})}
if(i.commandName==='lock'||i.commandName==='unlock'){const lock=i.commandName==='lock';await i.channel.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:lock?false:null});return i.reply({content:lock?'🔒 Gesperrt.':'🔓 Entsperrt.',ephemeral:true})}
if(i.commandName==='poll'){const q=i.options.getString('frage',true),a=['🇦','🇧','🇨','🇩','🇪'],os=[];for(let n=1;n<=5;n++){const x=i.options.getString(`option${n}`);if(x)os.push(x)}const m=await i.channel.send({embeds:[new EmbedBuilder().setTitle('📊 Umfrage').setDescription(`**${q}**\n\n${os.map((x,n)=>`${a[n]} ${x}`).join('\n')}`).setColor('#5865F2')]});for(let n=0;n<os.length;n++)await m.react(a[n]);return i.reply({content:'✅ Umfrage erstellt.',ephemeral:true})}
if(i.commandName==='dm'){const u=i.options.getUser('user',true);await u.send(i.options.getString('text',true));return i.reply({content:'✅ DM gesendet.',ephemeral:true})}
if(i.commandName==='nick'){const t=i.options.getMember('user'),n=i.options.getString('name',true);if(!canMod(i,t))return i.reply({content:'❌ Nicht möglich.',ephemeral:true});await t.setNickname(n);return i.reply({content:'✅ Nickname geändert.',ephemeral:true})}
}
if(i.isButton()){
 if(i.customId.startsWith('giveaway_join:')){const id=i.customId.split(':')[1],g=giveaways.get(id);if(!g||g.ended)return i.reply({content:'❌ Dieses Giveaway ist beendet.',ephemeral:true});if(g.entries.has(i.user.id))return i.reply({content:'Du bist bereits dabei. Klicke unten auf **Verlassen**, wenn du raus möchtest.',components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_leave:${id}`).setLabel('❌ Verlassen').setStyle(ButtonStyle.Danger))],ephemeral:true});g.entries.add(i.user.id);return i.reply({content:`🎉 Du bist jetzt beim Giveaway **${id}** dabei!`,components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_leave:${id}`).setLabel('❌ Verlassen').setStyle(ButtonStyle.Danger))],ephemeral:true})}
 if(i.customId.startsWith('giveaway_leave:')){const id=i.customId.split(':')[1],g=giveaways.get(id);if(!g||g.ended)return i.update({content:'❌ Dieses Giveaway ist bereits beendet.',components:[]});g.entries.delete(i.user.id);return i.update({content:`✅ Du hast Giveaway **${id}** verlassen.`,components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_join:${id}`).setLabel('🎉 Wieder beitreten').setStyle(ButtonStyle.Success))]})}
}
if(i.isStringSelectMenu()){
if(i.customId==='setup_command'){if(i.user.id!==SETUP_USER_ID)return i.reply({content:'❌ Kein Zugriff.',ephemeral:true});const c=i.values[0],rs=i.guild.roles.cache.filter(r=>r.id!==i.guild.id&&!r.managed).sort((a,b)=>b.position-a.position).first(25),rm=new StringSelectMenuBuilder().setCustomId(`setup_role:${c}`).setPlaceholder('Rolle auswählen ...').addOptions(rs.map(r=>({label:r.name.slice(0,100),value:r.id,description:`Darf /${c} benutzen`})));return i.update({content:`⚙️ Rolle für **/${c}** auswählen:`,embeds:[],components:[new ActionRowBuilder().addComponents(rm)]})}
if(i.customId.startsWith('setup_role:')){if(i.user.id!==SETUP_USER_ID)return i.reply({content:'❌ Kein Zugriff.',ephemeral:true});const c=i.customId.split(':')[1],r=i.values[0];commandRoles.set(`${i.guildId}:${c}`,r);return i.update({content:`✅ **/${c}** ist für die Rolle <@&${r}> freigeschaltet.\n\nDu kannst ihn weiterhin benutzen.`,embeds:[],components:[]})}
if(i.customId.startsWith('ausnach_')){const os=ausnachResponses.get(i.customId),s=os?.find(x=>String(x.number)===i.values[0]);return i.reply({content:s?.response||'❌ Nicht gefunden.',ephemeral:true})}
}
}catch(e){console.error(e);if(!i.replied&&!i.deferred)await i.reply({content:'❌ Fehler bei der Interaktion.',ephemeral:true}).catch(()=>{})}});
client.on('guildMemberAdd',async m=>{const c=m.guild.channels.cache.find(x=>x.name==='willkommen'&&x.isTextBased());if(!c)return;await c.send({embeds:[new EmbedBuilder().setTitle('👋 Willkommen!').setDescription(`Willkommen ${m} auf **${m.guild.name}**!`).setThumbnail(m.user.displayAvatarURL({size:256})).setColor(0x57F287)]}).catch(console.error)});
client.login(process.env.DISCORD_TOKEN);
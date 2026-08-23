require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const OWNER_ID = '1177592138968604675';
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const commandRoles = new Map();
const ausnach = new Map();
const giveaways = new Map();

const commands = [
  { name:'setup', description:'Commands und Rollen verwalten.' },
  { name:'nachricht', description:'Embed senden.', options:[{name:'text',description:'Text',type:3,required:true},{name:'bild',description:'Bild-URL',type:3,required:false},{name:'farbe',description:'HEX-Farbe',type:3,required:false}] },
  { name:'ausnach', description:'Auswahl mit bis zu 5 Optionen.', options:[
    {name:'nachricht',description:'Hauptnachricht',type:3,required:true},
    {name:'option1',description:'Option 1',type:3,required:true},{name:'option1interaktion',description:'Antwort 1',type:3,required:true},
    {name:'option2',description:'Option 2',type:3,required:false},{name:'option2interaktion',description:'Antwort 2',type:3,required:false},
    {name:'option3',description:'Option 3',type:3,required:false},{name:'option3interaktion',description:'Antwort 3',type:3,required:false},
    {name:'option4',description:'Option 4',type:3,required:false},{name:'option4interaktion',description:'Antwort 4',type:3,required:false},
    {name:'option5',description:'Option 5',type:3,required:false},{name:'option5interaktion',description:'Antwort 5',type:3,required:false}
  ] },
  { name:'clear',description:'Nachrichten löschen.',options:[{name:'anzahl',description:'1-100',type:4,required:true,min_value:1,max_value:100}] },
  { name:'kick',description:'Benutzer kicken.',options:[{name:'user',description:'Benutzer',type:6,required:true},{name:'grund',description:'Grund',type:3,required:false}] },
  { name:'ban',description:'Benutzer bannen.',options:[{name:'user',description:'Benutzer',type:6,required:true},{name:'grund',description:'Grund',type:3,required:false}] },
  { name:'unban',description:'Benutzer entbannen.',options:[{name:'userid',description:'Discord-ID',type:3,required:true}] },
  { name:'timeout',description:'Timeout setzen.',options:[{name:'user',description:'Benutzer',type:6,required:true},{name:'minuten',description:'Minuten',type:4,required:true,min_value:1,max_value:40320},{name:'grund',description:'Grund',type:3,required:false}] },
  { name:'untimeout',description:'Timeout entfernen.',options:[{name:'user',description:'Benutzer',type:6,required:true}] },
  { name:'userinfo',description:'Benutzerinfos.',options:[{name:'user',description:'Benutzer',type:6,required:false}] },
  { name:'avatar',description:'Avatar anzeigen.',options:[{name:'user',description:'Benutzer',type:6,required:false}] },
  { name:'serverinfo',description:'Serverinfos.' },
  { name:'say',description:'Text senden.',options:[{name:'text',description:'Text',type:3,required:true}] },
  { name:'announce',description:'Ankündigung senden.',options:[{name:'text',description:'Text',type:3,required:true}] },
  { name:'slowmode',description:'Slowmode setzen.',options:[{name:'sekunden',description:'0-21600',type:4,required:true,min_value:0,max_value:21600}] },
  { name:'lock',description:'Channel sperren.' }, { name:'unlock',description:'Channel entsperren.' },
  { name:'poll',description:'Umfrage erstellen.',options:[{name:'frage',description:'Frage',type:3,required:true},{name:'option1',description:'Option 1',type:3,required:true},{name:'option2',description:'Option 2',type:3,required:true},{name:'option3',description:'Option 3',type:3,required:false},{name:'option4',description:'Option 4',type:3,required:false},{name:'option5',description:'Option 5',type:3,required:false}] },
  { name:'dm',description:'DM senden.',options:[{name:'user',description:'Benutzer',type:6,required:true},{name:'text',description:'Text',type:3,required:true}] },
  { name:'nick',description:'Nickname ändern.',options:[{name:'user',description:'Benutzer',type:6,required:true},{name:'name',description:'Name',type:3,required:true}] },
  { name:'givewaystart',description:'Giveaway starten.',options:[{name:'preis',description:'Preis',type:3,required:true},{name:'dauer',description:'z.B. 30m, 2h, 1d',type:3,required:true},{name:'gewinner',description:'Anzahl Gewinner',type:4,required:true,min_value:1,max_value:20}] },
  { name:'givewayend',description:'Giveaway vorzeitig beenden.',options:[{name:'givewayid',description:'Giveaway-ID',type:3,required:true}] },
  { name:'reroll',description:'Gewinner neu auslosen.',options:[{name:'givewayid',description:'Giveaway-ID',type:3,required:true},{name:'anzahl',description:'Anzahl',type:4,required:true,min_value:1,max_value:20}] }
];

function error(i,text){return i.reply({content:`❌ ${text}`,ephemeral:true});}
function allowed(i,name){if(i.user.id===OWNER_ID)return true;const r=commandRoles.get(`${i.guildId}:${name}`);return Boolean(r&&i.member?.roles?.cache?.has(r));}
function parseHex(v){const x=v||'#5865F2';if(!/^#?[0-9a-f]{6}$/i.test(x))return null;return x.startsWith('#')?x:`#${x}`;}
function parseDuration(v){const m=/^(\d+)\s*(s|m|h|d|w)$/i.exec(v.trim());if(!m)return null;const units={s:1000,m:60000,h:3600000,d:86400000,w:604800000};const ms=Number(m[1])*units[m[2].toLowerCase()];return ms>=1000&&ms<=28*86400000?ms:null;}
function newGiveawayId(){return `GW-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000+Math.random()*9000)}`;}
function giveawayButton(id,ended=false){return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway:${id}`).setLabel(ended?'Giveaway beendet':'🎉 Beitreten').setStyle(ended?ButtonStyle.Secondary:ButtonStyle.Success).setDisabled(ended));}
function randomUsers(entries,count,exclude=[]){const pool=[...entries].filter(x=>!exclude.includes(x)),result=[];while(pool.length&&result.length<count)result.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);return result;}

async function finishGiveaway(g){
  if(!g||g.ended)return [];
  g.ended=true;
  if(g.timer)clearTimeout(g.timer);
  g.winnerIds=randomUsers(g.entries,g.winnerCount);
  const channel=await client.channels.fetch(g.channelId).catch(()=>null);
  if(!channel)return g.winnerIds;
  const message=await channel.messages.fetch(g.messageId).catch(()=>null);
  const winners=g.winnerIds.length?g.winnerIds.map(id=>`<@${id}>`).join(', '):'Keine Teilnehmer';
  const embed=new EmbedBuilder().setTitle('🎉 Giveaway beendet!').setDescription(`**Preis:** ${g.prize}\n**Gewinner:** ${winners}\n\n**Giveaway-ID:** \`${g.id}\``).setColor('#ED4245');
  if(message)await message.edit({embeds:[embed],components:[giveawayButton(g.id,true)]}).catch(()=>{});
  if(g.winnerIds.length)await channel.send(`🎉 Glückwunsch ${winners}! Ihr habt **${g.prize}** gewonnen!\nGiveaway-ID: \`${g.id}\``).catch(()=>{});
  else await channel.send(`❌ Giveaway **${g.id}** wurde beendet. Es gab keine Teilnehmer.`).catch(()=>{});
  return g.winnerIds;
}

async function registerCommands(){
  const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
  for(const guild of client.guilds.cache.values())await rest.put(Routes.applicationGuildCommands(client.user.id,guild.id),{body:commands});
}

client.once('ready',async()=>{console.log(`Bot online: ${client.user.tag}`);try{await registerCommands();console.log('Alle Slash-Commands registriert.')}catch(e){console.error('Command-Registrierung:',e)}});
client.on('guildCreate',async guild=>{try{const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);await rest.put(Routes.applicationGuildCommands(client.user.id,guild.id),{body:commands});}catch(e){console.error(e)}});

client.on('interactionCreate',async i=>{
  try{
    if(i.isButton()&&i.customId.startsWith('giveaway:')){
      const id=i.customId.slice(9),g=giveaways.get(id);
      if(!g||g.ended)return error(i,'Dieses Giveaway ist beendet.');
      if(g.entries.has(i.user.id)){g.entries.delete(i.user.id);return i.reply({content:'🚪 Du hast das Giveaway verlassen.',ephemeral:true});}
      g.entries.add(i.user.id);return i.reply({content:'🎉 Du bist jetzt dabei! Drücke den Button erneut, um das Giveaway zu verlassen.',ephemeral:true});
    }

    if(i.isStringSelectMenu()){
      if(i.customId==='setup:command'){
        if(i.user.id!==OWNER_ID)return error(i,'Kein Zugriff.');
        const name=i.values[0];
        const roles=i.guild.roles.cache.filter(r=>r.id!==i.guild.id&&!r.managed).sort((a,b)=>b.position-a.position).first(25);
        if(!roles.length)return i.update({content:'❌ Keine Rollen gefunden.',embeds:[],components:[]});
        const menu=new StringSelectMenuBuilder().setCustomId(`setup:role:${name}`).setPlaceholder('Rolle auswählen ...').addOptions(roles.map(r=>({label:r.name.slice(0,100),value:r.id,description:`Darf /${name} benutzen`.slice(0,100)})));
        return i.update({content:`⚙️ Rolle für **/${name}** auswählen:`,embeds:[],components:[new ActionRowBuilder().addComponents(menu)]});
      }
      if(i.customId.startsWith('setup:role:')){
        if(i.user.id!==OWNER_ID)return error(i,'Kein Zugriff.');
        const name=i.customId.substring('setup:role:'.length),role=i.values[0];
        commandRoles.set(`${i.guildId}:${name}`,role);
        return i.update({content:`✅ **/${name}** darf jetzt <@&${role}> benutzen.`,embeds:[],components:[]});
      }
      if(i.customId.startsWith('ausnach:')){
        const data=ausnach.get(i.customId),item=data?.find(x=>x.number===i.values[0]);
        return i.reply({content:item?.response||'❌ Antwort nicht gefunden.',ephemeral:true});
      }
    }

    if(!i.isChatInputCommand())return;
    const name=i.commandName;

    if(name==='setup'){
      if(i.user.id!==OWNER_ID)return error(i,'Nur der Bot-Owner darf /setup benutzen.');
      const options=commands.filter(c=>c.name!=='setup').map(c=>({label:`/${c.name}`.slice(0,100),value:c.name,description:c.description.slice(0,100)}));
      const menu=new StringSelectMenuBuilder().setCustomId('setup:command').setPlaceholder('Command auswählen ...').addOptions(options);
      return i.reply({embeds:[new EmbedBuilder().setTitle('⚙️ Bot Setup').setDescription('Command auswählen und danach Rolle festlegen.').setColor('#5865F2')],components:[new ActionRowBuilder().addComponents(menu)],ephemeral:true});
    }
    if(!allowed(i,name))return error(i,'Command nicht eingerichtet oder keine passende Rolle.');

    if(name==='givewaystart'){
      const ms=parseDuration(i.options.getString('dauer',true));
      if(!ms)return error(i,'Ungültige Dauer. Nutze z.B. `30m`, `2h` oder `1d`.');
      const g={id:newGiveawayId(),guildId:i.guildId,channelId:i.channelId,messageId:null,creator:i.user.id,prize:i.options.getString('preis',true),winnerCount:i.options.getInteger('gewinner',true),entries:new Set(),winnerIds:[],ended:false};
      const end=Date.now()+ms;
      const embed=new EmbedBuilder().setTitle('🎉 GIVEAWAY').setDescription(`**Preis:** ${g.prize}\n**Gewinner:** ${g.winnerCount}\n**Endet:** <t:${Math.floor(end/1000)}:R>\n\nKlicke auf **🎉 Beitreten**, um teilzunehmen!\n\n**Giveaway-ID:** \`${g.id}\``).setColor('#57F287');
      const message=await i.channel.send({embeds:[embed],components:[giveawayButton(g.id)]});
      g.messageId=message.id;giveaways.set(g.id,g);g.timer=setTimeout(()=>finishGiveaway(g),ms);
      return i.reply({content:`✅ Giveaway erstellt! ID: **${g.id}**`,ephemeral:true});
    }

    if(name==='givewayend'){
      const id=i.options.getString('givewayid',true),g=giveaways.get(id);
      if(!g)return error(i,'Giveaway-ID nicht gefunden.');
      if(g.guildId!==i.guildId)return error(i,'Dieses Giveaway gehört zu einem anderen Server.');
      if(g.creator!==i.user.id&&i.user.id!==OWNER_ID)return error(i,'Nur der Ersteller oder Bot-Owner darf es beenden.');
      if(g.ended)return error(i,'Das Giveaway ist bereits beendet.');
      await finishGiveaway(g);return i.reply({content:`✅ Giveaway **${id}** wurde beendet.`,ephemeral:true});
    }

    if(name==='reroll'){
      const id=i.options.getString('givewayid',true),count=i.options.getInteger('anzahl',true),g=giveaways.get(id);
      if(!g)return error(i,'Giveaway-ID nicht gefunden.');
      if(!g.ended)return error(i,'Das Giveaway ist noch nicht beendet.');
      const winners=randomUsers(g.entries,count,g.winnerIds);
      if(!winners.length)return error(i,'Es gibt keine weiteren Teilnehmer für einen Reroll.');
      g.winnerIds.push(...winners);
      await i.channel.send(`🔄 **Reroll** für Giveaway \`${id}\`: ${winners.map(x=>`<@${x}>`).join(', ')} — **${g.prize}**`);
      return i.reply({content:`✅ ${winners.length} neue Gewinner ausgelost.`,ephemeral:true});
    }

    if(name==='nachricht'){
      const color=parseHex(i.options.getString('farbe'));if(!color)return error(i,'Ungültige HEX-Farbe.');
      const embed=new EmbedBuilder().setDescription(i.options.getString('text',true)).setColor(color);
      const image=i.options.getString('bild');
      if(image){try{new URL(image);embed.setImage(image);}catch{return error(i,'Ungültige Bild-URL.');}}
      await i.channel.send({embeds:[embed]});return i.reply({content:'✅ Gesendet.',ephemeral:true});
    }

    if(name==='ausnach'){
      const list=[];
      for(let n=1;n<=5;n++){
        const option=i.options.getString(`option${n}`),response=i.options.getString(`option${n}interaktion`);
        if((option&&!response)||(!option&&response))return error(i,`Option ${n} ist unvollständig.`);
        if(option)list.push({number:String(n),label:option,response});
      }
      const id=`ausnach:${i.user.id}:${Date.now()}`;ausnach.set(id,list);
      const menu=new StringSelectMenuBuilder().setCustomId(id).setPlaceholder('Option auswählen ...').addOptions(list.map(x=>({label:x.label.slice(0,100),value:x.number})));
      await i.channel.send({embeds:[new EmbedBuilder().setDescription(i.options.getString('nachricht',true)).setColor('#5865F2')],components:[new ActionRowBuilder().addComponents(menu)]});
      return i.reply({content:'✅ Gesendet.',ephemeral:true});
    }

    if(name==='clear'){const deleted=await i.channel.bulkDelete(i.options.getInteger('anzahl',true),true);return i.reply({content:`🧹 ${deleted.size} Nachrichten gelöscht.`,ephemeral:true});}
    if(name==='say'){await i.channel.send(i.options.getString('text',true));return i.reply({content:'✅ Gesendet.',ephemeral:true});}
    if(name==='announce'){await i.channel.send({embeds:[new EmbedBuilder().setTitle('📢 Ankündigung').setDescription(i.options.getString('text',true)).setColor('#5865F2')]});return i.reply({content:'✅ Gesendet.',ephemeral:true});}
    if(name==='serverinfo'){const g=i.guild;return i.reply({embeds:[new EmbedBuilder().setTitle(`🏠 ${g.name}`).addFields({name:'Mitglieder',value:String(g.memberCount),inline:true},{name:'Channels',value:String(g.channels.cache.size),inline:true},{name:'Rollen',value:String(g.roles.cache.size),inline:true}).setColor('#5865F2')]});}
    if(name==='avatar'){const u=i.options.getUser('user')||i.user;return i.reply({embeds:[new EmbedBuilder().setTitle(`🖼️ ${u.tag}`).setImage(u.displayAvatarURL({size:1024,dynamic:true})).setColor('#5865F2')]});}
    if(name==='userinfo'){const u=i.options.getUser('user')||i.user,m=i.guild.members.cache.get(u.id);return i.reply({embeds:[new EmbedBuilder().setTitle(`👤 ${u.tag}`).setThumbnail(u.displayAvatarURL()).addFields({name:'ID',value:u.id},{name:'Beitritt',value:m?.joinedAt?m.joinedAt.toLocaleString('de-DE'):'Unbekannt'}).setColor('#5865F2')],ephemeral:true});}
    if(name==='slowmode'){await i.channel.setRateLimitPerUser(i.options.getInteger('sekunden',true));return i.reply({content:'✅ Slowmode geändert.',ephemeral:true});}
    if(name==='lock'||name==='unlock'){await i.channel.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:name==='lock'?false:null});return i.reply({content:name==='lock'?'🔒 Channel gesperrt.':'🔓 Channel entsperrt.',ephemeral:true});}
    if(name==='dm'){const u=i.options.getUser('user',true);await u.send(i.options.getString('text',true));return i.reply({content:'✅ DM gesendet.',ephemeral:true});}
    if(name==='nick'){const m=i.options.getMember('user');if(!m)return error(i,'Benutzer nicht gefunden.');await m.setNickname(i.options.getString('name',true));return i.reply({content:'✅ Nickname geändert.',ephemeral:true});}
    if(name==='kick'||name==='ban'||name==='timeout'||name==='untimeout'){
      const m=i.options.getMember('user');if(!m||m.id===i.user.id||m.id===client.user.id||m.roles.highest.position>=i.member.roles.highest.position)return error(i,'Dieser Benutzer kann nicht moderiert werden.');
      if(name==='kick')await m.kick(i.options.getString('grund')||'Kein Grund');
      if(name==='ban')await m.ban({reason:i.options.getString('grund')||'Kein Grund'});
      if(name==='timeout')await m.timeout(i.options.getInteger('minuten',true)*60000,i.options.getString('grund')||'Kein Grund');
      if(name==='untimeout')await m.timeout(null);
      return i.reply({content:'✅ Aktion ausgeführt.',ephemeral:true});
    }
    if(name==='unban'){await i.guild.members.unban(i.options.getString('userid',true));return i.reply({content:'✅ Entbannt.',ephemeral:true});}
    if(name==='poll'){
      const question=i.options.getString('frage',true),options=[];for(let n=1;n<=5;n++){const v=i.options.getString(`option${n}`);if(v)options.push(v);}
      const emojis=['🇦','🇧','🇨','🇩','🇪'];const msg=await i.channel.send({embeds:[new EmbedBuilder().setTitle('📊 Umfrage').setDescription(`**${question}**\n\n${options.map((x,n)=>`${emojis[n]} ${x}`).join('\n')}`).setColor('#5865F2')]});
      for(let n=0;n<options.length;n++)await msg.react(emojis[n]);return i.reply({content:'✅ Umfrage erstellt.',ephemeral:true});
    }
  }catch(e){console.error('Interaction error:',e);if(!i.replied&&!i.deferred)await error(i,'Die Anwendung konnte den Command nicht verarbeiten.');}
});

client.on('guildMemberAdd',async member=>{const channel=member.guild.channels.cache.find(c=>c.name==='willkommen'&&c.isTextBased());if(channel)await channel.send({embeds:[new EmbedBuilder().setTitle('👋 Willkommen!').setDescription(`Willkommen ${member} auf **${member.guild.name}**!`).setThumbnail(member.user.displayAvatarURL()).setColor('#57F287')]});});
client.login(process.env.DISCORD_TOKEN);
require('dotenv').config();
const {Client,GatewayIntentBits,REST,Routes}=require('discord.js');
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers]});
const OWNER_ID='1177592138968604675';
const commands=[];
async function register(){const r=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);await r.put(Routes.applicationCommands(client.user.id),{body:[]});for(const g of client.guilds.cache.values())await r.put(Routes.applicationGuildCommands(client.user.id,g.id),{body:commands});}
client.once('ready',async()=>{try{await register();console.log('Alte globale Commands gelöscht.')}catch(e){console.error(e)}console.log(`Bot online: ${client.user.tag}`)});
client.login(process.env.DISCORD_TOKEN);
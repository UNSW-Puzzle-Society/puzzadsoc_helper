import Discord from "discord.js";
import { accept, addmembers, registerteam, reject } from "./src/command_processor";
import { bot_token } from "./src/config";

const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
  });

client.on('message', async msg => {
  // obtain prefix
  const prefix = "!";
  if (!msg.content.startsWith(prefix) || msg.author.bot) return;

	const args = msg.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift()?.toLowerCase();

  // process commands
  if (command === 'registerteam'){
    // Create voice channel
    // Create text channel
    // Create role
    const res = await registerteam(client, msg, args);
  } else if (command === 'addmembers'){
    // Wait for targets to accept or reject
    // Add to queue or hashmap of pending invitations for their respective user and members 
    const res = await addmembers(client, msg, args);
  } else if (command === 'accept') {
    // Look for user's id in the queue or hashmap and update their role
    const res = await accept(client, msg);
  } else if (command === 'reject') {
    // Look for user's id in the queue or hashmap and don't update their role
    const res = await reject(client, msg);
  } else if (command === 'help') {
    // Display commands
    msg.channel.send(`
    !registerteam [teamname]          Create voice & text channels & roles for your teamname
    !addmembers [@user1 @user2 ...]   Add @users to your team
    !accept                           Accept team invitation
    !reject                           Reject team invitation
    !help                             Display this menu
    `)
  }
});
  
client.login(bot_token);
import Discord from "discord.js";
import { accept, addmembers, deleteAll, leaveteam, registerteam, reject } from "./src/command_processor";
import { bot_token, msg_channel_id } from "./src/config";
import sqlite3, { OPEN_CREATE, OPEN_READWRITE } from "sqlite3";
import {open} from "sqlite";

(async () => {
const client = new Discord.Client();
// Defined in client.on('ready',...)
// TODO: handle opening when there's no file and handle when there's a file
let db = await open({
  filename: "./andpuzzsoc.db",
  driver: sqlite3.Database,
  mode: OPEN_READWRITE
}).then(db1 => db1, err => {console.log("ERROR: no database found, creating one"); return null;});
// When database does not exist create the tables
if (db == null){
  db = await open({
    filename: "./andpuzzsoc.db",
    driver: sqlite3.Database,
    mode: OPEN_READWRITE | OPEN_CREATE
  }).then(db1 => db1, err => {console.log("ERROR: cannot create db, " + err); return null;});
  if (db !== null){
    await db.exec(`CREATE TABLE puzzUsers (
      discord_id TEXT PRIMARY KEY,
      puzz_team_id TEXT
    )`);
    // TODO: creator_id can be stale if the creator leaves the team while having members in them
    await db.exec(`CREATE TABLE puzzTeams (
      puzz_team TEXT PRIMARY KEY,
      puzz_team_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      parent_channel_id TEXT NOT NULL,
      text_channel_id TEXT NOT NULL,
      voice_channel_id TEXT NOT NULL
    )`);
    await db.exec(`CREATE TABLE pendingInvitations (
      discord_id TEXT NOT NULL,
      puzz_team TEXT NOT NULL,
      puzz_team_id TEXT NOT NULL
    )`)
  }
}


client.on('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
  });

client.on('message', async msg => {
  if (msg.channel.id !== msg_channel_id) return;
  // obtain prefix
  const prefix = "!";
  if (!msg.content.startsWith(prefix) || msg.author.bot || !db) return;

	const args = msg.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift()?.toLowerCase();

  // process commands
  // TODO: check the number of arguments to the command
  if (command === 'registerteam'){
    // Create voice channel
    // Create text channel
    // Create role
    if (args.length != 1) {
      msg.reply('register team can only accept 1 argument');
      return;
    }
    const res = await registerteam(client, msg, args, db);
  } else if (command === 'addmembers'){
    // Wait for targets to accept or reject
    // Add to queue or hashmap of pending invitations for their respective user and members
    if (args.length == 0) {
      msg.reply('addmembers needs 1 or more members to be mentioned');
      return;
    }
    const res = await addmembers(client, msg, args,db);
  } else if (command === 'accept') {
    if (args.length != 1) {
      msg.reply('accept only accepts teamname');
      return;
    }
    const res = await accept(client, msg,args, db);
  } else if (command === 'reject') {
    if (args.length != 1) {
      msg.reply('reject only rejects teamname');
      return;
    }
    const res = await reject(client, msg,args, db);
  } else if (command === 'leaveteam'){
    if (args.length != 0) {
      msg.reply('leaveteam does not accept arguments');
      return;
    }
    const res  = await leaveteam(client,msg,args, db);
  } else if (command === 'deleteall'){
    const res = await deleteAll(client, msg, args, db);
  } else if (command === 'help') {
    // Display commands
    msg.channel.send(`
    \`\`\`
!registerteam teamname
    eg. !registerteam poggers
    Create voice & text channels & roles for your teamname

!addmembers @user1 @user2 ...
    eg. !addmembers @despacito @dream
    Add @users to your team

!accept teamname
    eg. !accept poggers
    Accept team invitation

!reject teamname
    eg. !reject poggers
    Reject team invitation

!leaveteam
    Leave your current team

!help
    Display this menu
    \`\`\`
    `)
  }
});
  
client.login(bot_token);
})()
import Discord from "discord.js";
import { Database } from "sqlite";
import { guild_id, hint_givers_id} from "./config";
import sqlite3 from "sqlite3";


// Create role
// Create voice channel
// Create text channel
// Assign msg author to new role
// global state of the regitered user's with their team
type DiscordId= string;
// create a persistent storage for userTeams
// TODO: Add the execs to the channel too
async function registerteam(client: Discord.Client, msg:Discord.Message, args: string[],db: Database<sqlite3.Database, sqlite3.Statement>){
    let row = await db.get('SELECT * FROM puzzUsers WHERE discord_id = ?', msg.author.id);
    if (row && row["puzz_team_id"] !== null) {
        msg.reply("You're already in a team.")
        return;
    }
    row = await db.get('SELECT * FROM puzzTeams WHERE puzz_team = ?', args[0]);
    if (row && row["puzz_team"] !== undefined){
        msg.reply("Team name already exists.")
        return;
    }
    // TODO: handle color registration for teams and maybe modifiably change their colors when created
    const guild = await client.guilds.fetch(guild_id);
    const team_name = args[0];
    const new_role = await guild.roles.create({
        data:{
            name: team_name
        },
        reason: `Created by ${msg.author.tag} for team: ${team_name}`
    });
    const member = await msg.member?.roles.add(new_role);
    // TODO: what happens when there's a team trying to register with an existing name
    const perm_ow : Discord.OverwriteResolvable[] = [
        {
            id: guild.id,
            deny: ['VIEW_CHANNEL']
        },
        {
            id: new_role.id,
            allow: ['VIEW_CHANNEL']
        },
        {
            id: hint_givers_id,
            allow: ['VIEW_CHANNEL']
        }
    ];
    const blank_category = await guild.channels.create(`team-${team_name}`,{
        type: 'category'
    })
    const new_text_channel = await guild.channels.create(`team-${team_name}`,{
        type: 'text',
        permissionOverwrites: perm_ow,
        parent: blank_category.id,
    })
    const new_voice_channel = await guild.channels.create(`team-${team_name}`,{
        type: 'voice',
        permissionOverwrites: perm_ow,
        parent: blank_category.id,
    })
    const new_category = await blank_category.overwritePermissions(perm_ow);
    await db.run(
        'INSERT OR REPLACE INTO puzzTeams (puzz_team, puzz_team_id, creator_id, parent_channel_id, text_channel_id, voice_channel_id) VALUES (?,?,?,?,?,?)',
        `${team_name}`,
        `${new_role.id}`,
        `${msg.author.id}`,
        `${new_category.id}`,
        `${new_text_channel.id}`,
        `${new_voice_channel.id}`
    )
    await db.run(
        'INSERT OR REPLACE INTO puzzUsers (discord_id, puzz_team_id) VALUES (?,?)',
        `${msg.author.id}`,
        `${new_role.id}`
    )
    let bot_id = client.user?.id
    if (bot_id) await guild.members.resolve(bot_id)?.roles.add(new_role);
    // TODO add roles into execs too
    msg.channel.send(`Team ${team_name} has been registered, and lead by ${msg.author.tag}`)
    // TODO cleanup code if any of the awaits fail
}

// Create a persistent storage for pendingAccepts
async function addmembers(client: Discord.Client, msg: Discord.Message, args: string[],db: Database<sqlite3.Database, sqlite3.Statement>){
    const mention_ids = args.map(mention_id => mention_id.slice(2,-1))
                            .map(mention_id => mention_id.startsWith('!') ? mention_id.slice(1) : mention_id);
    let row = await db.get('SELECT * FROM puzzUsers WHERE discord_id = ?', msg.author.id);
    // TODO: Ascertain if team/role exists
    if (row && row["puzz_team_id"] !== null){
        let res = await db.get('SELECT * FROM puzzTeams WHERE puzz_team_id = ?', row["puzz_team_id"]);
        let role = res["puzz_team_id"];
        // TODO: is the mention_id already in a team?
        mention_ids.forEach(async(mention_id) => {
            await db.run(
                'INSERT OR IGNORE INTO puzzUsers (discord_id, puzz_team_id) VALUES (?,NULL)',
                `${mention_id}`,
            )
            await db.run(
                'INSERT INTO pendingInvitations (discord_id,puzz_team, puzz_team_id) VALUES (?,?,?)',
                `${mention_id}`,
                `${res["puzz_team"]}`,
                `${role}`
            )
        });
        msg.channel.send(`Awaiting acceptance or rejection of members`);
    }else{
        msg.reply(`You are not part of any team. Create or join a team.`);
    }
}

// given a team name
// if team name is in user's pending then accept and change user teamname col
// Otherwise reply no teams
async function accept(client: Discord.Client, msg:Discord.Message, args: string[],db: Database<sqlite3.Database, sqlite3.Statement>) {
    const user_row = await db.get('SELECT * FROM puzzUsers WHERE discord_id = ?', msg.author.id);
    const pendingInvites_row = await db.get('SELECT * FROM pendingInvitations WHERE puzz_team = ? AND discord_id = ?', args[0], msg.author.id);
    if (user_row["puzz_team_id"] !== null){
        msg.channel.send(`You are already in a team`);
    }
    else if (pendingInvites_row !== undefined) {
        let puzz_team = await db.get('SELECT * FROM puzzTeams WHERE puzz_team_id = ?',pendingInvites_row["puzz_team_id"]);
        await msg.member?.roles.add(pendingInvites_row["puzz_team_id"]);
        msg.channel.send(`Accepting ${puzz_team["puzz_team"]}'s invitation`);
        await db.run ('UPDATE puzzUsers SET puzz_team_id = ? WHERE discord_id = ?',pendingInvites_row["puzz_team_id"], msg.author.id);
        await db.run('DELETE FROM pendingInvitations WHERE discord_id = ?', msg.author.id);
    } else {
        msg.channel.send(`No teams to accept, please ask their members to invite you.`)
    }
}
async function reject(client: Discord.Client, msg:Discord.Message, args: string[],db: Database<sqlite3.Database, sqlite3.Statement>) {
    const pendingInvites_row = await db.get('SELECT * FROM pendingInvitations WHERE puzz_team = ?', args[0]);
    if (pendingInvites_row !== undefined) {
        await db.run('DELETE FROM pendingInvitations WHERE discord_id = ? AND puzz_team = ?', msg.author.id, args[0]);
        msg.channel.send(`Rejecting ${pendingInvites_row["puzz_team"]}'s invitation`);
    } else {
        msg.channel.send(`No teams to reject, please ask their members to invite you.`)
    }
}

// Individually remove teams and their channels
async function deleteOne(client: Discord.Client, puzz_team_id : string,db: Database<sqlite3.Database, sqlite3.Statement>){
    const guild = await client.guilds.fetch(guild_id);
    let row = await db.get('SELECT * FROM puzzTeams WHERE puzz_team_id = ?', puzz_team_id);
    await guild.channels.resolve(row["text_channel_id"])?.delete();
    await guild.channels.resolve(row["voice_channel_id"])?.delete();
    await guild.channels.resolve(row["parent_channel_id"])?.delete();
    await guild.roles.resolve(row["puzz_team_id"])?.delete();
}


// Remove all teams and their channels and roles
async function deleteAll(client: Discord.Client, msg:Discord.Message, args: string[],db: Database<sqlite3.Database, sqlite3.Statement>){
    const rowsCount = await db.each(
        'SELECT * FROM puzzTeams',
        async (err,row) => {
            if (err) console.log("ERROR: deleteAll" + err);
            const guild = await client.guilds.fetch(guild_id);
            await guild.channels.resolve(row["text_channel_id"])?.delete();
            await guild.channels.resolve(row["voice_channel_id"])?.delete();
            await guild.channels.resolve(row["parent_channel_id"])?.delete();
            await guild.roles.resolve(row["puzz_team_id"])?.delete();
        }
    )
    await db.run('UPDATE puzzUsers SET puzz_team_id = NULL');
    await db.run('DELETE FROM puzzTeams');
    msg.reply("Deleted all roles");
}


// TODO: Ping an exec for help for a puzzle
// User quit team
async function leaveteam(client: Discord.Client, msg:Discord.Message, args: string[],db: Database<sqlite3.Database, sqlite3.Statement>) {
    const user_row = await db.get('SELECT * FROM puzzUsers WHERE discord_id = ?', msg.author.id);
    let role = user_row["puzz_team_id"];
    if (role){
        msg.member?.roles.remove(role);
        await db.run('UPDATE puzzUsers SET puzz_team_id = NULL WHERE discord_id = ?', msg.author.id);
        msg.channel.send(`${msg.author.tag} has left the team`);
        let row = await db.get('SELECT COUNT(*) FROM puzzUsers WHERE puzz_team_id = ?', role);
        if (row["COUNT(*)"] === 0) deleteOne(client, role, db);
    } else {
        msg.channel.send(`You are not in a team yet.`);
    }
}

export {registerteam, addmembers, accept, reject, leaveteam, deleteAll};
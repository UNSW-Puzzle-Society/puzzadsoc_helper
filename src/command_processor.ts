import Discord from "discord.js";
import { guild_id} from "./config";


// Create role
// Create voice channel
// Create text channel
// Assign msg author to new role
// global state of the regitered user's with their team
type DiscordId= string;
// create a persistent storage for userTeams
let userTeams :Record<DiscordId,Discord.Role>= {};
async function registerteam(client: Discord.Client, msg:Discord.Message, args: string[]){
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
    userTeams[msg.author.id] = new_role;
    msg.channel.send(`Team ${team_name} has been registered, and lead by ${msg.author.tag}`)
    // TODO cleanup code if any of the awaits fail
}

// global state store for pending accepts
// TODO: Create a persistent storage for pendingAccepts
let pendingAccepts :Record<DiscordId,Discord.Role>= {};
async function addmembers(client: Discord.Client, msg: Discord.Message, args: string[]){
    const mention_ids = args.map(mention_id => mention_id.slice(2,-1))
                            .map(mention_id => mention_id.startsWith('!') ? mention_id.slice(1) : mention_id);
    const user_tag = args[0];
    // TODO: Do I have to check if the members exists?
    const guild = await client.guilds.fetch(guild_id);
    const role = userTeams[msg.author.id];
    if (role !== undefined){
        // TODO: is the mention_id already in a team?
        mention_ids.forEach(mention_id => {
            pendingAccepts[mention_id] = role;
        });
        // TODO return a message to the user
        msg.channel.send(`Awaiting acceptance or rejection of ${user_tag}`);
    }
}

async function accept(client: Discord.Client, msg:Discord.Message) {
    const role = pendingAccepts[msg.author.id];
    const isInTeam = userTeams[msg.author.id]
    if (isInTeam){
        msg.channel.send(`You are already in team ${isInTeam.name}`);
    }
    else if (role) {
        msg.member?.roles.add(role);
        msg.channel.send(`Accepting ${role.name}'s invitation`);
        delete pendingAccepts[msg.author.id];
    } else {
        msg.channel.send(`No teams to accept, please ask their members to invite you.`)
    }
}
async function reject(client: Discord.Client, msg:Discord.Message) {
    const role = pendingAccepts[msg.author.id];
    if (role) {
        delete pendingAccepts[msg.author.id];
        msg.channel.send(`Rejecting ${role.name}'s invitation`);
    } else {
        msg.channel.send(`No teams to reject, please ask their members to invite you.`)
    }
}

// TODO: Individually remove teams and their channels
// TODO: Collectivelly remove teams and their channels
// TODO: Remove all teams and their channels


// TODO: Ping an exec for help for a puzzle
// TODO: what happens when a team has no members?
// User quit team
async function leaveteam(client: Discord.Client, msg:Discord.Message) {
    const role = userTeams[msg.author.id];
    if (role){
        msg.member?.roles.remove(role);
        delete userTeams[msg.author.id];
        msg.channel.send(`${msg.author.tag} has been removed from team ${role.name}`);
    } else {
        msg.channel.send(`You are not in a team yet.`);
    }
}

export {registerteam, addmembers, accept, reject, leaveteam};
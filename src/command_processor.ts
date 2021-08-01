import Discord from "discord.js";


// Create role
// Create voice channel
// Create text channel
// Assign msg author to new role
async function registerteam(client: Discord.Client, msg:Discord.Message, args: string[]){
    const guild_id = "";
    const guild = await client.guilds.fetch(guild_id);
    const new_role = await guild.roles.create({
        data:{
            name: args[0]
        },
        reason: `Created by ${msg.author.tag} for team: ${args[0]}`
    });
    const member = await msg.member?.roles.add(new_role);
    const new_text_channel = await guild.channels.create(`team-${args[0]}`,{
        type: 'text',
        permissionOverwrites: [
            {
                id: guild.id,
                deny: ['VIEW_CHANNEL']
            },
            {
                id: new_role.id,
                allow: ['VIEW_CHANNEL']
            }
        ],
    })
    const new_voice_channel = await guild.channels.create(`team-${args[0]}`,{
        type: 'voice',
        permissionOverwrites: [
            {
                id: guild.id,
                deny: ['VIEW_CHANNEL']
            },
            {
                id: new_role.id,
                allow: ['VIEW_CHANNEL']
            }
        ]
    })
    // TODO cleanup code later
}

// global state store for pending accepts
type DiscordId= string;
let pendingAccepts :Record<DiscordId,Discord.Role>= {};
async function addmembers(client: Discord.Client, msg: Discord.Message, args: string[]){
    const mention_ids = args.map(mention_id => mention_id.slice(2,-1))
                            .map(mention_id => mention_id.startsWith('!') ? mention_id.slice(1) : mention_id);
    const guild_id = "";
    const guild = await client.guilds.fetch(guild_id);
    // TODO: this can be a problem when there's a higher role than a team member
    const role = msg.member?.roles.highest;
    if (role !== undefined)
        // TODO: is the mention_id already in a team?
        mention_ids.forEach(mention_id => {
            pendingAccepts.mention_id = role;
        });
    // TODO return a message to the user
}

async function accept(client: Discord.Client, msg:Discord.Message) {
    const role = pendingAccepts[msg.author.id];
    if (role) {
        msg.member?.roles.add(role);
    }
    // TODO: return a message to the user
}
async function reject(client: Discord.Client, msg:Discord.Message) {
    const role = pendingAccepts[msg.author.id];
    if (role) {
        delete pendingAccepts[msg.author.id];
    }
    //TODO: return a message to the user
}

export {registerteam, addmembers, accept, reject};
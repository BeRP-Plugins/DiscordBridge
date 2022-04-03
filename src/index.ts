import { PluginApi } from "./@interface/pluginApi.i";
import {
  Client,
  Intents,
  MessageEmbed,
  TextChannel,
} from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

const { token, channelId, clientId, guildId, AutoConnect, realmName, logMessageEvents } = require("../config.json");

function getSavedPic(eventXuid){
    const tempPicMap = {
        2533274884028261: "https://cdn.discordapp.com/avatars/269249777185718274/a_f7a7df655ec0c612ec4e42094adc1903.png"
    }
    if (eventXuid in tempPicMap) {
	    return tempPicMap[eventXuid]
	} else {
	    return "https://i.imgur.com/7ltWLoa.png"
	}
}


class DiscBot {
    private api: PluginApi
    private client: Client
    constructor(api: PluginApi) {
        this.api = api;
        this.client = new Client({
        intents: [
          Intents.FLAGS.GUILDS,
          Intents.FLAGS.GUILD_MESSAGES,
          Intents.FLAGS.GUILD_MEMBERS,
          ],
        });
        }
	
    async onLoaded(): Promise<void> {
        this.api.getLogger().info("Discord-MC Bridge loaded!");
        if(!AutoConnect.attempt) return
	    this.api.getLogger().info("Attempting auto-connection with realm...");
	    try {
	        this.api.autoConnect(AutoConnect.email, AutoConnect.realmId)
        }
	    catch(error) {
	        this.api.getLogger().error("AutoConnect failed... Attempting reconnect", error)
			try {
			    this.api.autoReconnect(AutoConnect.email, AutoConnect.realmId)
			}
			catch(anotherError) {
			    this.api.getLogger().error("AutoReconnect failed. Skipping...", anotherError)
			}
        }
    }
    async onEnabled(): Promise<void> {
	this.api.getLogger().info("Discord-MC Bridge enabled! (onEnabled)");
	this.api.getLogger().info("Discord-MC Bridge connecting to Discord Client...");
        let client = this.client
        client.login(token);
	this.api.getLogger().info("Discord-MC Bridge login complete.");
        client.on("ready", async () => {
            this.api.getLogger().info("Discord-MC Bridge Client Ready, setting activity...");
            client.user.setActivity(`over ${realmName}`, { type: "WATCHING" })
	    this.api.getLogger().info("Discord-MC Bridge Activity set.");
            this.api.getLogger().info(`Now bridged with Discord as ${client.user.username}`);
            const StartEmbed = new MessageEmbed()
                .setColor("#139dbf")
                .setDescription(`**${realmName}'s chat has been bridged with discord**`)
            this.sendEmbed([StartEmbed])
            
            this.api
                .getCommandManager()
                .executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"§a§l§oDiscord-MC Bridge has been connected.§r\"}]}`);
            const guild = await client.guilds.fetch(guildId);
            const cmds = await guild.commands.fetch();
            let arr = [];
            cmds.forEach((cmd) => {
                arr.push(cmd.name);
            });
            const commands = [
                new SlashCommandBuilder()
                    .setName("list")
                    .setDescription("Gets a list of people currently on the realm."),
                ].map((command) => command.toJSON());
                const rest = new REST({ version: "9" }).setToken(token);
                async () => {
                    try {
                        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
                            body: commands,
                        });
                        this.api
                            .getLogger()
                            .success("Successfully registered the list command.");
                    }
                    catch (error) {
                        this.api.getLogger().error("Error occurred while attempting to register list command", error);
                    }
                };
            
        });
        client.on("messageCreate", (message) => {
            if (message.author.bot)
                return;
            if (message.channel.id == channelId) {
			    if (logMessageEvents) {
				    this.api.getLogger().success("Received new message event from the Discord client:");
				    this.api.getLogger().success(`   "${message.content}"`);
				}
                this.api
                    .getCommandManager()
                    .executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"§8[§9Discord§8]§f §7${message.author.username}§f: ${message.content}§r\"}]}`);
            }
        });
        this.api.getEventManager().on("PlayerMessage", async (packet) => {
		    if (logMessageEvents) {
				this.api.getLogger().success("Received new message event from the Realms client:");
				this.api.getLogger().success(`   "${packet.message}"`);
			}
            this.sendMessage(`[${packet.sender
                .getConnection()
                .realm.name.replace(/§[0-9A-FK-OR]/gi, "")
                .replace("§g", "")}] ${packet.sender.getName()}: ${packet.message}§r`)
        });
        this.api.getEventManager().on("PlayerInitialized", (userJoin) => {
			let eventXuid = userJoin.getXuid()
            const Join = new MessageEmbed()
                .setColor("#00ff00")
				.setTitle("__Player connected!__")
                .setDescription(`**${userJoin.getName()}** has joined the realm\nXUID: [${eventXuid}]\nDevice: ${userJoin.getDevice()}`)
				.setImage(getSavedPic(eventXuid));
            return this.sendEmbed([Join]);
        });
/**		this.api.getEventManager().on("PlayerDied", (userDied) => {
            const Death = new MessageEmbed()
                .setColor("#ff0000")
                .setDescription(`Oof! **${userDied.player}** was just killed by ${userDied.killer}. RIP!`);
            return this.sendEmbed([Death])
        });**/
        this.api.getEventManager().on("PlayerLeft", async (userLeave) => {
            const Leave = new MessageEmbed()
                .setColor("#9d3838")
                .setDescription(`**${userLeave.getName()}** has left the realm.`);
            return this.sendEmbed([Leave]);
        });
        client.on("interactionCreate", async (interaction) => {
            if (!interaction.isCommand())
                return;
            const { commandName } = interaction;
            if (commandName === "list") {
                const realmName = this.api.getConnection().realm.name;
                let response = `/10 Players Online**:`;
                let players = [];
                response += `\n*-* ${this.api.getConnection().getXboxProfile().extraData.displayName}`;
                for (const [, p] of this.api.getPlayerManager().getPlayerList()) {
                    players.push(p.getName());
                    response += `\n*-* ${p.getName()}`;
                }
                const fancyResponse = new MessageEmbed()
                    .setColor("#5a0cc0")
                    .setTitle(`${realmName}`)
                    .setDescription(`**${players.length + 1}${response}`);
                await interaction
                    .reply({ embeds: [fancyResponse] })
                    .catch((error) => {
						this.api.getLogger().error(error);
                });
            }
        });
    }
    public onDisabled() {
        const fancyStopMSG = new MessageEmbed()
            .setColor("#139dbf")
            .setDescription(":octagonal_sign: ***Discord-MC Bridge has been disconnected.***");
        this.sendEmbed([fancyStopMSG])
    }

    public sendMessage(message: string): void {
        this.client.channels
        .fetch(channelId)
        .then((channel) => (channel as TextChannel)
            .send(message))
        .catch((error) => {
            this.api.getLogger().error(error);
        });
    }

    public sendEmbed(embed: MessageEmbed[]): void {
        this.client.channels
        .fetch(channelId)
        .then(async (channel) => await (channel as TextChannel).send({ embeds: embed }).catch((error) => {
        this.api.getLogger().error(error);
    })).catch((error) => {
        this.api.getLogger().error(error);
    });
    }
}

export = DiscBot;

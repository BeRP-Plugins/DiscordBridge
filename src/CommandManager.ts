import { MessageEmbed } from "discord.js"
import DiscordBridge from "src"
import {
  CommandOptions,
  CommandResponse,
  CommandsMap,
} from "./@interface/DiscordBridge.i"
import { PluginApi } from "./@interface/pluginApi.i"

export class CommandManager {
  private api: PluginApi
  private plugin: DiscordBridge
  private commands = new Map<string, CommandsMap>()
  public prefix = "-"

  constructor(api: PluginApi, plugin: DiscordBridge) {
    this.api = api
    this.plugin = plugin
    this.defaults()
  }
  public onEnabled(): void {
    this.plugin.getClient().on("message", (data) => {
      if (data.channel.id != this.plugin.config.channelId || !data.content.startsWith(this.prefix) || data.author.bot) return
      const parsedCommand = this.parseCommand(data.content)
      if (!this.commands.has(parsedCommand.command)) return data.reply("This command does not exist!")
      const command = this.commands.get(parsedCommand.command)
      if (!command.options.perms) return command.callback({
        data: data,
        args: parsedCommand.args,
      })

      const outputs: boolean[] = []
      for (const perm of command.options.perms) {
        outputs.push(data.guild.members.cache.get(data.author.id).hasPermission(perm as any))
      }
      if (outputs.includes(false)) return data.reply("You don't have permission to use this command!")

      command.callback({
        data: data,
        args: parsedCommand.args,
      })
    })
  }
  public onDisabled(): void {
    return
  }
  private parseCommand(content: string): { command: string, args: string[] } {
    const command = content.replace(this.prefix, '').split(' ')[0]
    const args = content.replace(`${this.prefix}${command} `, '').split(' ')
    if (args[0] == `${this.prefix}${command}`) args[0] = undefined

    return {
      command: command,
      args: args,
    }
  }
  public registerCommand(options: CommandOptions, callback: (data: CommandResponse) => void): void {
    if (this.commands.has(options.command)) return this.api.getLogger().warn(`The command "${options.command}" is already registered!`)
    this.commands.set(options.command, {
      options: options,
      callback: callback,
    })
  }
  private defaults(): void {
    this.registerCommand({
      command: "help",
      description: "Displays a list of available commands.",
    }, () => {
      const commands = []
      for (const [, command] of this.commands) {
        commands.push(`**${command.options.command}** - *${command.options.description}*`)
      }
      const embed = new MessageEmbed()
      embed.setColor("#5865F2")
      embed.setTitle("**Showing all Available Commands**")
      embed.setDescription(commands.join("\n"))
      this.plugin.sendEmbed(embed)
    })
  }
}

import { PluginApi } from './@interface/pluginApi.i'
import {
  Client,
  MessageEmbed,
  TextChannel,
} from 'discord.js'
import fs from 'fs'
import path from 'path'
import EventEmitter from 'events'
import { CommandManager } from './CommandManager'
import { Config } from './@interface/DiscordBridge.i'

class DiscordBridge extends EventEmitter {
    private api: PluginApi
    public config: Config
    private client: Client
    private main: DiscordBridge
    private commandManager: CommandManager
    public handleMessages = true

    constructor(api: PluginApi) {
      super()
      this.api = api
      this.config = JSON.parse(fs.readFileSync(path.resolve(this.api.path + '/config.json'), "utf-8"))
      this.client = new Client()
      this.commandManager = new CommandManager(this.api, this)
    }
    public onLoaded(): void {
      this.api.getLogger().info("Loaded!")
    }
    public async onEnabled(): Promise<void> {
      this.api.createInterface({
        name: "DiscordBridge",
        interface: fs.readFileSync(path.resolve(this.api.path + '/src' + '/@interface' + '/DiscordBridge.i.ts'), "utf-8"),
      })
      this.api.getLogger().info('Enabled!')
      this.main = await (await this.api.getPluginByInstanceId(this.api.getConfig().name, 1)).plugin as unknown as DiscordBridge
      this.commandManager.onEnabled()
      this.api.getEventManager().on("PlayerMessage", (data) => {
        if (!this.handleMessages) return
        const c = this.api.getConnection()
        this.main.sendMessage(`**[**${c.realm.name.replace(/§\S/g, "")}**]** **${data.sender.getName()}:** ${data.message.replace(/§\S/g, "")}`)
        for (const [, con] of c.getConnectionManager().getConnections()) {
          if (con.id === c.id) continue
          const pl = con.getPlugins().get(this.api.getConfig().name)
          const api = pl.api
          api.getWorldManager().sendMessage(`§l§8[§r§b${con.realm.name.replace(/§\S/g, "")}§l§8]§r §7${data.sender.getName()}:§r ${data.message.replace(/§\S/g, "")}`)
        }
      })
      if (this.api.getApiId() === 1) return this.createBot()
    }
    public onDisabled(): void {
      this.api.getLogger().info('Disabled!')
      this.commandManager.onDisabled()
      this.client.destroy()
    }
    public sendMessage(message: string): void {
      this.client.channels.fetch(this.config.channelId).then((channel: TextChannel) => {
        channel.send(message)
      })
    }
    public sendEmbed(embed: MessageEmbed): void {
      this.client.channels.fetch(this.config.channelId).then((channel: TextChannel) => {
        channel.send({embed})
      })
    }
    private createBot(): void {
      this.client.login(this.config.token)
      this.client.on("ready", () => {
        this.api.getLogger().success(`${this.client.user.tag} is online!`)
      })
      this.client.on("message", (data) => {
        if (data.channel.id != this.config.channelId || data.author.bot || !this.handleMessages || data.content.startsWith(this.getCommandManager().prefix)) return
        for (const [, c] of this.api.getConnection().getConnectionManager()
          .getConnections()) {
          const pl = c.getPlugins().get(this.api.getConfig().name)
          const api = pl.api
          api.getWorldManager().sendMessage(`§l§8[§r§9Discord§l§8]§r §7${data.author.tag}:§r ${data.content}`)
        }
      })
    }
    public getClient(): Client { return this.client }
    public getCommandManager(): CommandManager { return this.commandManager }
}

export = DiscordBridge

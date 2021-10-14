import { PluginApi } from './@interface/pluginApi.i'
import {
  Client,
  TextChannel,
} from 'discord.js'
import fs from 'fs'
import path from 'path'

class discordBridge {
    private api: PluginApi
    private config: { token: string, channelID: string } = JSON.parse(fs.readFileSync(path.resolve(process.cwd() + '/plugins/discordBridge/config.json')).toString('utf-8'))
    private client: Client = new Client()

    constructor(api: PluginApi) {
      this.api = api
    }

    public onEnabled(): void {
      this.api.getLogger().info('Enabled!')
      this.api.getEventManager().on('PlayerMessage', (data) => {
        const message = {
          berp: {
            event: 'PlayerMessageDiscord',
            sender: data.sender.getName(),
            message: data.message,
            data: {
              device: data.sender.getDevice(),
              xuid: data.sender.getXuid(),
              realm: this.api.getConnection().realm.name.replace(/§\S/g, ""),
            },
          },
        }
        for (const [, connection] of this.api.getConnection().getConnectionManager()
          .getConnections()) {
          try {
            connection.sendPacket('command_request', {
              command: `tellraw @a[tag=berpUser] {"rawtext":[{"text":"${JSON.stringify(message).replace(/"/g, '\\"')}"}]}`,
              interval: false,
              origin: {
                request_id: '',
                uuid: '',
                type: 'player',
              },
            })
          } catch (err) {
            this.api.getLogger().error(err)
          }
        }
      })
      if (this.api.getApiId() === 1) return this.createBot()
    }
    public onDisabled(): void {
      this.api.getLogger().info('Disabled!')
      this.client.destroy()
    }
    public createBot(): void {
      this.client.login(this.config.token)
      this.client.once('ready', () => this.api.getLogger().success(`${this.client.user.tag} is online!`))
      this.api.getSocketManager().on('Message', (packet) => {
        this.client.channels.fetch(this.config.channelID).then((channel: TextChannel) => channel.send(`**[**${packet.data.realm}**]** **${packet.sender}:** ${packet.message}`))
      })
      this.client.on('message', (data) => {
        if (data.channel.id != this.config.channelID || data.author.bot) return
        this.api.getLogger().info(`[Discord] ${data.author.username}#${data.author.discriminator}: ${data.content}`)
        for (const [, connection] of this.api.getConnection().getConnectionManager()
          .getConnections()) {
          const message = `§l§8[§r§9Discord§l§8]§r §7${data.author.username}#${data.author.discriminator}:§r ${data.content}`
          try {
            connection.sendPacket('command_request', {
              command: `tellraw @a {"rawtext":[{"text":"${message}"}]}`,
              interval: false,
              origin: {
                request_id: '',
                uuid: '',
                type: 'player',
              },
            })
          } catch (err) {
            this.api.getLogger().error(err)
          }
        }
      })
    }
}

export = discordBridge

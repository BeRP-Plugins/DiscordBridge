import { PluginApi } from "./pluginApi.i"

export interface DiscordBridge {
  new(api: PluginApi)
  config: Config
  handleMessages: boolean
  onLoaded(): Promise<void>
  onEnabled(): Promise<void>
  onDisabled(): void
  sendMessage(message: string, channel?: string): void
  sendEmbed(embed: any, channel?: string): void
  getClient(): any
  registerCommand(command: DiscordCommand): void
}

export interface Config {
  clientId: string
  guildId: string
  channelId: string
  token: string
  realmName: string
  logMessageEvents: boolean
  AutoConnect: {
    attempt: boolean
    email: string
    realmId: number
  }
}

interface DiscordCommand {
  name: string;
  description: string;
  response: (interaction: any) => void;
}

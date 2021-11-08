import { PluginApi } from "./pluginApi.i"

export interface DiscordBridge {
  new(api: PluginApi)
  config: Config
  handleMessages: boolean
  onLoaded(): void
  onEnabled(): Promise<void>
  onDisabled(): void
  sendMessage(message: string): void
  sendEmbed(embed: any): void
  getClient(): any
  getCommandManager(): CommandManager
}

interface CommandManager {
  new(api: PluginApi, plugin: DiscordBridge)
  prefix: string
  onEnabled(): void
  onDisabled(): void
  registerCommand(options: CommandOptions, callback: (data: CommandResponse) => void): void
}

export interface CommandOptions {
  command: string
  description: string
  perms?: string[]
}

export interface CommandResponse {
  data: any
  args: string[]
}

export interface CommandsMap {
  options: CommandOptions
  callback(data: CommandResponse): void
}

export interface Config {
  token: string
  channelId: string
}

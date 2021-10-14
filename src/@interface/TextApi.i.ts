import {
  PluginApi,
  Player,
} from "./pluginApi.i"

export interface FormResponse {
  line: number
  target: Player
  formId: number
}

export interface TextAPI {
  new (api: PluginApi)
  onEnabled(): void
  onDisabled(): void
  createForm(): TextForm
  getForms(): Map<number, TextForm>
}

interface TextForm {
  new(api: PluginApi, plugin: TextAPI)
  title: string
  spacer: string
  expires: number
  blackenScreen: boolean
  freezePlayer: boolean
  slot: "actionbar" | "title" | "subtitle"
  addButton(text: string): TextForm
  addLabel(text: string): TextForm
  sendForm(player: Player, callback: (data: FormResponse) => void): Promise<void>
  dispose(blank?: boolean): void
  getFormId(): number
}

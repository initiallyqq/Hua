export type ViewMode = "edit" | "split" | "preview";

export type ThemeOption = "light" | "dark" | "system";

export type TileColorMode = "system" | "custom";
export type BackgroundFit = "cover" | "contain" | "repeat";

export interface ModelConfig {
  modelId: string;
  displayName: string;
  modelTypes?: string[];
  inputModes?: string[];
  capabilities?: string[];
}

export interface ProviderConfig {
  id: string;
  enabled: boolean;
  name: string;
  protocol: string;
  apiKey: string;
  baseUrl: string;
  apiPath: string;
  models: ModelConfig[];
}

export interface AppConfig {
  locale: string;
  notesDir: string;
  globalShortcut: string;
  closeToTray: boolean;
  autostart: boolean;
  defaultViewMode: string;
  noteAutoSave: boolean;
  noteSurfaceAutoSave: boolean;
  tileColor: string;
  tileColorMode: TileColorMode;
  theme: ThemeOption;
  fontSize: number;
  surfaceFontSize: number;
  tabIndentSize: number;
  externalFileAutoSave: boolean;
  rememberSurfaceSize: boolean;
  tileCtrlClose: boolean;
  tileRenderMarkdown: boolean;
  renderHtmlMarkdown: boolean;
  surfaceWidth?: number;
  surfaceHeight?: number;
  toggleVisibilityShortcut: string;
  openAtCursor: boolean;
  backgroundImagePath?: string;
  backgroundFit?: BackgroundFit;
  backgroundDim?: number;
  backgroundBlur?: number;
  backgroundScale?: number;
  backgroundPositionX?: number;
  backgroundPositionY?: number;
  providers?: ProviderConfig[];
}

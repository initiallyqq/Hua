import { useEffect, useState, useCallback } from "react";
import "./App.css";
import { ContextMenuProvider } from "./components/ContextMenu";
import { MainWindow } from "./components/MainWindow";
import { NotePad } from "./components/NotePad";
import { TileShowcase } from "./components/TileShowcase";
import { AppSidebar } from "./components/AppSidebar";
import { SettingsPage } from "./components/SettingsPage";
import { DashboardPage } from "./components/DashboardPage";
import { InkPlaybackPage } from "./components/InkPlaybackPage";
import { CoWritePage } from "./components/CoWritePage";
import { WindowFrame } from "./components/WindowFrame";
import { tabToIndentListener } from "indent-textarea";
import { getConfig, saveConfig } from "./features/settings/api";
import { applyTheme, watchSystemTheme } from "./features/settings/theme";
import type { AppConfig, ThemeOption, ProviderConfig } from "./features/settings/types";
import type { AppView } from "./components/AppSidebar";
import { getInitialRoute } from "./features/windows/windowRoutes";
import { syncLanguage } from "./locales";
import { listen } from "@tauri-apps/api/event";

function App() {
  const route = getInitialRoute();

  const [sidebarView, setSidebarView] = useState<AppView>("home");
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [settingsConfig, setSettingsConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    let cleanup = () => {};
    getConfig()
      .then((config) => {
        const theme = (config.theme || "system") as ThemeOption;
        applyTheme(theme);
        cleanup = watchSystemTheme(theme);
        document.documentElement.style.setProperty(
          "--tab-indent-size",
          String(config.tabIndentSize ?? 2),
        );
        void syncLanguage(config.locale);
        setSettingsConfig(config);
        setProviders(config.providers ?? []);
      })
      .catch(() => {});
    return () => cleanup();
  }, []);

  useEffect(() => {
    let themeCleanup = () => {};
    const unlisten = listen<AppConfig>("config-changed", (event) => {
      const theme = (event.payload.theme || "system") as ThemeOption;
      applyTheme(theme);
      themeCleanup();
      themeCleanup = watchSystemTheme(theme);
      document.documentElement.style.setProperty(
        "--tab-indent-size",
        String(event.payload.tabIndentSize ?? 2),
      );
      void syncLanguage(event.payload.locale);
      setSettingsConfig(event.payload);
      setProviders(event.payload.providers ?? []);
    });
    return () => {
      themeCleanup();
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const handleTab = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement)) return;
      if (target.dataset.tabIndent !== "true") return;
      tabToIndentListener(event);
    };
    window.addEventListener("keydown", handleTab, true);
    return () => window.removeEventListener("keydown", handleTab, true);
  }, []);

  useEffect(() => {
    const isWindows =
      navigator.userAgent.includes("Windows") || navigator.platform.toLowerCase().startsWith("win");
    if (!isWindows) return;

    const preventSystemMenu = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "Space") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", preventSystemMenu, true);
    return () => document.removeEventListener("keydown", preventSystemMenu, true);
  }, []);

  const handleProvidersChange = useCallback(
    async (newProviders: ProviderConfig[]) => {
      setProviders(newProviders);
      if (settingsConfig) {
        const updated = { ...settingsConfig, providers: newProviders };
        setSettingsConfig(updated);
        try {
          const saved = await saveConfig(updated);
          setSettingsConfig(saved);
        } catch {
          // silently fail
        }
      }
    },
    [settingsConfig],
  );

  const handleConfigChange = useCallback(
    async (newConfig: AppConfig) => {
      setSettingsConfig(newConfig);
      try {
        const saved = await saveConfig(newConfig);
        setSettingsConfig(saved);
      } catch {
        // silently fail
      }
    },
    [],
  );

  if (route.view === "notepad") {
    return (
      <ContextMenuProvider>
        <div className="h-full font-body text-ink overflow-hidden">
          <NotePad initialNoteId={route.noteId} />
        </div>
      </ContextMenuProvider>
    );
  }

  if (route.view === "tile") {
    return (
      <ContextMenuProvider>
        <WindowFrame>
          <div className="h-full font-body text-ink overflow-hidden">
            <TileShowcase noteId={route.noteId} />
          </div>
        </WindowFrame>
      </ContextMenuProvider>
    );
  }

  return (
    <ContextMenuProvider>
      <WindowFrame>
        <div className="h-full font-body text-ink overflow-hidden flex">
          <AppSidebar
            activeView={sidebarView}
            onViewChange={setSidebarView}
          />
          <div className="flex-1 flex flex-col min-w-0">
            {sidebarView === "home" ? (
              <DashboardPage />
            ) : sidebarView === "playback" ? (
              <InkPlaybackPage />
            ) : sidebarView === "cowrite" && settingsConfig ? (
              <CoWritePage
                providers={providers}
                noteId=""
                noteContent=""
              />
            ) : sidebarView === "settings" && settingsConfig ? (
              <SettingsPage
                config={settingsConfig}
                providers={providers}
                onConfigChange={handleConfigChange}
                onProvidersChange={handleProvidersChange}
                onClose={() => setSidebarView("home")}
              />
            ) : (
              <MainWindow
                initialConfig={settingsConfig ?? undefined}
              />
            )}
          </div>
        </div>
      </WindowFrame>
    </ContextMenuProvider>
  );
}

export default App;

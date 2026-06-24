import { useEffect, useState, useCallback } from "react";
import "./App.css";
import { ContextMenuProvider } from "./components/ContextMenu";
import { MainWindow } from "./components/MainWindow";
import { NotePad } from "./components/NotePad";
import { TileShowcase } from "./components/TileShowcase";
import { AppSidebar } from "./components/AppSidebar";
import { ModelProviderPage } from "./components/ModelProviderPage";
import { tabToIndentListener } from "indent-textarea";
import { getConfig, saveConfig } from "./features/settings/api";
import { applyTheme, watchSystemTheme } from "./features/settings/theme";
import type { AppConfig, ThemeOption, ProviderConfig } from "./features/settings/types";
import { getInitialRoute } from "./features/windows/windowRoutes";
import { syncLanguage } from "./locales";
import { listen } from "@tauri-apps/api/event";

type SidebarView = "main" | "providers" | "settings";

function App() {
  const route = getInitialRoute();
  const activeView = route.view;

  const [sidebarView, setSidebarView] = useState<SidebarView>("main");
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
          // silently fail - config will be saved on next change
        }
      }
    },
    [settingsConfig],
  );

  const handleSidebarChange = useCallback(
    (view: SidebarView) => {
      setSidebarView(view);
    },
    [],
  );

  if (activeView === "notepad") {
    return (
      <ContextMenuProvider>
        <div className="app-window-shell h-screen font-body text-ink overflow-hidden">
          <NotePad initialNoteId={route.noteId} />
        </div>
      </ContextMenuProvider>
    );
  }

  if (activeView === "tile") {
    return (
      <ContextMenuProvider>
        <div className="app-window-shell h-screen font-body text-ink overflow-hidden">
          <TileShowcase noteId={route.noteId} />
        </div>
      </ContextMenuProvider>
    );
  }

  return (
    <ContextMenuProvider>
      <div className="app-window-shell h-screen font-body text-ink overflow-hidden flex">
        <AppSidebar
          activeView={sidebarView}
          onViewChange={handleSidebarChange}
        />
        <div className="flex-1 flex flex-col min-w-0">
          {sidebarView === "providers" ? (
            <ModelProviderPage
              providers={providers}
              onProvidersChange={handleProvidersChange}
            />
          ) : sidebarView === "settings" && settingsConfig ? (
            <div className="flex-1 flex min-h-0">
              <MainWindow
                initialSettingsOpen={true}
                initialConfig={settingsConfig}
              />
            </div>
          ) : (
            <MainWindow
              initialConfig={settingsConfig ?? undefined}
            />
          )}
        </div>
      </div>
    </ContextMenuProvider>
  );
}

export default App;

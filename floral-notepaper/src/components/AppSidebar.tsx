import { useState } from "react";

export type AppView = "main" | "providers" | "settings";

interface AppSidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

interface SidebarItem {
  view: AppView;
  label: string;
  icon: (props: { size?: number }) => React.ReactNode;
}

function NoteIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z" />
      <polyline points="16 3 16 8 21 8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="14" y2="16" />
    </svg>
  );
}

function ProviderIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01" />
    </svg>
  );
}

function SettingsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const sidebarItems: SidebarItem[] = [
  { view: "main", label: "笔记", icon: NoteIcon },
  { view: "providers", label: "供应商", icon: ProviderIcon },
  { view: "settings", label: "设置", icon: SettingsIcon },
];

export function AppSidebar({ activeView, onViewChange }: AppSidebarProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <nav className="w-[52px] h-full bg-paper/60 border-r border-paper-deep/25 flex flex-col items-center py-4 gap-1 shrink-0">
      <div className="mb-3">
        <div className="w-8 h-8 rounded-xl bg-bamboo/90 flex items-center justify-center">
          <span className="text-cloud text-[13px] font-display font-bold tracking-wide">花</span>
        </div>
      </div>

      {sidebarItems.map((item, idx) => {
        const isActive = activeView === item.view;
        const isHovered = hoveredIdx === idx;

        return (
          <button
            key={item.view}
            onClick={() => onViewChange(item.view)}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`
              relative w-9 h-9 flex items-center justify-center rounded-xl
              transition-all duration-200 cursor-pointer group
              ${isActive
                ? "text-bamboo bg-bamboo-mist/80"
                : isHovered
                  ? "text-ink-soft bg-paper-warm/80"
                  : "text-ink-ghost hover:text-ink-faint"
              }
            `}
            title={item.label}
          >
            <item.icon size={17} />
            <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-ink/85 text-cloud text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-lg">
              {item.label}
            </div>
          </button>
        );
      })}

      <div className="flex-1" />

      <div className="w-5 h-px bg-paper-deep/30 mb-1" />

      <div className="text-[9px] text-ink-ghost/40 font-mono tracking-wider select-none">
        v1.0
      </div>
    </nav>
  );
}

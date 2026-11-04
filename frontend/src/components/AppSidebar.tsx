import { AppIcon, type IconName } from "./AppIcon";
import type { AppPage } from "../types/brandGuideline";

interface AppSidebarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

const navigationItems: { id: AppPage; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "guidelines", label: "Brand Guidelines", icon: "guidelines" },
  { id: "checker", label: "Content Checker", icon: "checker" },
  { id: "history", label: "Review History", icon: "history" },
];

export function AppSidebar({
  activePage,
  onNavigate,
  userName,
  userEmail,
  onLogout,
}: AppSidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:min-h-screen lg:w-[252px] lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-5 py-5 lg:px-6 lg:py-7">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
          <AppIcon name="shield" className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold tracking-tight text-slate-950">
            BrandGuard <span className="text-indigo-600">AI</span>
          </p>
          <p className="text-xs text-slate-500">Brand governance</p>
        </div>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4 lg:py-5"
      >
        <p className="hidden px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:block">
          Workspace
        </p>
        {navigationItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <AppIcon name={item.icon} className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 p-4 lg:block lg:p-5">
        <div className="min-w-0 lg:rounded-xl lg:bg-slate-50 lg:p-4">
          <p className="truncate text-sm font-semibold text-slate-800">{userName}</p>
          <p className="truncate text-xs text-slate-500">{userEmail}</p>
          <p className="mt-2 hidden items-center gap-2 text-xs font-semibold text-slate-700 lg:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Human review stays in control
          </p>
          <p className="mt-2 hidden text-xs leading-5 text-slate-500 lg:block">
            BrandGuard supports reviewers. It never approves or publishes
            content on its own.
          </p>
        </div>
        <button
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          onClick={onLogout}
          type="button"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

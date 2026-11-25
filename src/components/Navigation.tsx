import { Award, CalendarDays, Feather, LayoutDashboard, Smartphone, Timer } from 'lucide-react';
import type { AppTab } from '../types/championship';

interface NavigationProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onQuickStartTournament: () => void;
}

const NAV_ITEMS: {
  id: AppTab;
  label: string;
  mobileLabel: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: 'painel', label: 'Painel', mobileLabel: 'Painel', icon: LayoutDashboard },
  { id: 'torneio', label: 'Torneio', mobileLabel: 'Torneio', icon: Timer },
  { id: 'registro', label: 'Registro Mobile', mobileLabel: 'Registro', icon: Smartphone },
  { id: 'etapas', label: 'Etapas', mobileLabel: 'Etapas', icon: CalendarDays },
  { id: 'aves', label: 'Aves', mobileLabel: 'Aves', icon: Feather },
  { id: 'ranking', label: 'Ranking', mobileLabel: 'Ranking', icon: Award },
];

export function TopNav({
  activeTab,
  onSelectTab,
  onQuickStartTournament,
}: NavigationProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 print:hidden">
      {/* Desktop & Tablet 3-Zone Top Bar */}
      <div className="hidden md:flex max-w-5xl mx-auto px-4 lg:px-5 h-13 items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onSelectTab('painel')}
          className="font-display text-sm lg:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-emerald-800 transition-colors cursor-pointer"
        >
          Canto &amp; Fibra
        </button>

        <nav aria-label="Navegação principal" className="flex items-center gap-3.5 lg:gap-5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1.5 text-xs lg:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onQuickStartTournament}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
          >
            Mesa do Torneio
          </button>
        </div>
      </div>

      {/* Mobile Compact Top Bar (44px) */}
      <div className="flex md:hidden px-3.5 h-11 items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelectTab('painel')}
          className="font-display text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Canto &amp; Fibra
        </button>

        <button
          type="button"
          onClick={onQuickStartTournament}
          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          Mesa ao vivo
        </button>
      </div>
    </header>
  );
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
}: {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}) {
  return (
    <nav
      aria-label="Navegação inferior"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 print:hidden"
    >
      <div className="grid grid-cols-6 items-center h-14 px-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-emerald-800' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={isActive ? 2.25 : 1.75} />
              <span
                className={`text-[10px] leading-none mt-1 whitespace-nowrap ${
                  isActive ? 'font-semibold' : 'font-medium'
                }`}
              >
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

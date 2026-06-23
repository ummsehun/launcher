import React, { ReactNode } from 'react';
import { ElementType } from 'react';
import { cn } from '../../../shared/lib/cn';

export type SidebarNavItem = {
  id: string;
  label: string;
  icon: ElementType;
  isActive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export type SettingsLayoutProps = {
  title: string;
  navItems: SidebarNavItem[];
  children: ReactNode;
};

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ title, navItems, children }) => {
  return (
    <div className="flex w-full h-full bg-launcher-bg text-launcher-text">
      <div className="w-64 bg-launcher-surface/40 border-r border-launcher-divider flex flex-col p-4">
        <h2 className="text-[17px] font-bold text-launcher-text mb-6 pl-4 mt-6">{title}</h2>
        <div className="flex flex-col gap-0.5">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={item.onClick}
              disabled={item.disabled}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium text-[13.5px] cursor-pointer",
                item.isActive 
                  ? "bg-launcher-accent/10 text-launcher-accent font-semibold" 
                  : "text-launcher-textMuted hover:bg-launcher-control/50 hover:text-launcher-text",
                item.disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <item.icon size={17} className={cn(item.isActive ? "text-launcher-accent" : "text-launcher-textMuted")} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-none">
          {children}
        </div>
      </div>
    </div>
  );
};

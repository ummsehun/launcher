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
      <div className="w-[240px] bg-launcher-surface border-r border-launcher-border flex flex-col p-4">
        <h2 className="text-2xl font-bold text-launcher-text mb-8 pl-4 mt-6">{title}</h2>
        <div className="flex flex-col gap-1">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={item.onClick}
              disabled={item.disabled}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-[14px]",
                item.isActive 
                  ? "bg-launcher-accent/10 text-launcher-accent font-bold border-l-4 border-launcher-accent" 
                  : "border-l-4 border-transparent text-launcher-textMuted",
                !item.isActive && !item.disabled && "hover:bg-launcher-control hover:text-launcher-text",
                item.disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-none">
          {children}
        </div>
      </div>
    </div>
  );
};

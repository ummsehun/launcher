import React from 'react';
import { cn } from '../lib/cn';

type AppShellProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

export const AppShell: React.FC<AppShellProps> = ({ sidebar, children }) => {
  return (
    <div className="bg-launcher-bg text-launcher-text flex h-screen w-full overflow-hidden">
      {/* Thin Left Sidebar */}
      <div id="launcher-sidebar-panel" className="bg-launcher-sidebarBg border-launcher-sidebarBorder w-20 flex-shrink-0 border-r flex flex-col z-50">
        {sidebar}
      </div>
      
      {/* Main Content (Immersive) */}
      <main className="bg-[var(--series-bg-base)] flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
};

import React from 'react';
import { cn } from '../lib/cn';

type AppShellProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

export const AppShell: React.FC<AppShellProps> = ({ sidebar, children }) => {
  return (
    <div className="theme-app flex h-screen w-full overflow-hidden">
      {/* Thin Left Sidebar */}
      <div className="theme-sidebar w-sidebar flex-shrink-0 border-r flex flex-col z-50">
        {sidebar}
      </div>
      
      {/* Main Content (Immersive) */}
      <main className="theme-main flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
};

import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="app-shell app-shell--workspace">
      <div className="workspace-layout">
        <Sidebar />
        <div className="workspace-main">{children}</div>
      </div>
    </main>
  );
}
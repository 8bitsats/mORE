'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Menu Button */}
        <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary neon-text">ORB Miner</span>
          </div>
        </div>
        <div className="container mx-auto p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}

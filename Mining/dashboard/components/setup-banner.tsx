'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

async function fetchSetupStatus() {
  const res = await fetch('/api/setup-status');
  if (!res.ok) throw new Error('Failed to fetch setup status');
  return res.json();
}

export function SetupBanner() {
  const pathname = usePathname();

  const { data: setupStatus, isLoading } = useQuery({
    queryKey: ['setup-status'],
    queryFn: fetchSetupStatus,
    refetchInterval: 10000, // Check every 10 seconds
  });

  // Don't show banner on the setup page itself
  if (pathname === '/setup' || isLoading) {
    return null;
  }

  // Only show if setup is needed
  if (!setupStatus?.setupNeeded) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 border-b-4 border-yellow-400 shadow-2xl animate-pulse">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-full">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg flex items-center gap-2">
                ⚠️ SETUP REQUIRED - BOT NOT CONFIGURED
              </h3>
              <p className="text-white/95 text-sm mt-1 font-medium">
                Your wallet private key and RPC endpoint must be configured before mining can begin.
              </p>
            </div>
          </div>
          <Link
            href="/setup"
            className="flex items-center gap-2 bg-white text-red-600 hover:bg-yellow-100 px-6 py-3 rounded-lg font-black text-base transition-all shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap border-2 border-yellow-400"
          >
            <Settings className="h-5 w-5" />
            COMPLETE SETUP NOW
          </Link>
        </div>
      </div>
    </div>
  );
}

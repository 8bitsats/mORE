'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface MiningAnimationProps {
  isActive: boolean;
  status?: 'mining' | 'waiting' | 'idle';
  className?: string;
  deployed?: number[]; // Array of 25 numbers showing SOL deployed per square
}

export function MiningAnimation({ isActive, status = 'idle', className, deployed }: MiningAnimationProps) {
  const [activeSquares, setActiveSquares] = useState<Set<number>>(new Set());
  const [primarySquare, setPrimarySquare] = useState<number | null>(null);
  const [scanningSquare, setScanningSquare] = useState<number>(0);

  // Check if we have actual deployment data
  const hasDeployments = deployed && deployed.some(amt => amt > 0);

  useEffect(() => {
    if (status === 'idle') {
      setActiveSquares(new Set());
      setPrimarySquare(null);
      setScanningSquare(0);
      return;
    }

    // If we have real deployment data and mining, animate the deployed squares
    if (hasDeployments && status === 'mining') {
      // Get indices of deployed squares
      const deployedIndices = deployed
        .map((amt, idx) => amt > 0 ? idx : -1)
        .filter(idx => idx !== -1);

      // Cycle through deployed squares with a scanning effect
      const scanInterval = setInterval(() => {
        setScanningSquare(prev => {
          const nextIndex = (deployedIndices.indexOf(prev) + 1) % deployedIndices.length;
          return deployedIndices[nextIndex] ?? deployedIndices[0];
        });

        // Also pulse 2-3 random deployed squares
        const pulseCount = Math.min(3, Math.floor(Math.random() * 3) + 2);
        const newActive = new Set<number>();
        for (let i = 0; i < pulseCount; i++) {
          const randomIdx = deployedIndices[Math.floor(Math.random() * deployedIndices.length)];
          if (randomIdx !== undefined) newActive.add(randomIdx);
        }
        setActiveSquares(newActive);
      }, 300);

      return () => clearInterval(scanInterval);
    }

    // Default animation for non-deployed mining/waiting
    const animationSpeed = status === 'mining' ? 400 : 800;

    const interval = setInterval(() => {
      const newActive = new Set<number>();
      const count = status === 'mining'
        ? Math.floor(Math.random() * 5) + 3
        : Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < count; i++) {
        newActive.add(Math.floor(Math.random() * 25));
      }
      setActiveSquares(newActive);

      if (status === 'mining') {
        setPrimarySquare(Math.floor(Math.random() * 25));
      } else {
        setPrimarySquare(null);
      }
    }, animationSpeed);

    return () => clearInterval(interval);
  }, [status, hasDeployments, deployed]);

  return (
    <div className={cn("inline-block", className)}>
      <div className="grid grid-cols-5 gap-[3px] p-2.5 bg-black/60 rounded-lg border border-primary/40">
        {Array.from({ length: 25 }, (_, i) => {
          // If we have deployment data, show actual deployments
          const hasDeployment = deployed && deployed[i] > 0;
          const deploymentAmount = deployed ? deployed[i] : 0;

          // Animation states for deployed squares
          const isScanning = scanningSquare === i;
          const isPulsing = activeSquares.has(i);

          // Otherwise use default animation
          const isActivated = activeSquares.has(i);
          const isPrimary = primarySquare === i;

          return (
            <div
              key={i}
              title={hasDeployment ? `Square ${i}: ${deploymentAmount.toFixed(4)} SOL` : `Square ${i}`}
              className={cn(
                "w-4 h-4 rounded-[2px] transition-all duration-300 relative",
                hasDeployments
                  ? hasDeployment
                    ? isScanning
                      ? "bg-cyan-500/90 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.9)]"
                      : isPulsing
                      ? "bg-blue-500/80 border border-blue-400/90 shadow-[0_0_12px_rgba(59,130,246,0.8)]"
                      : "bg-blue-500/60 border border-blue-500/70 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                    : "bg-gray-800/30 border border-gray-700/30"
                  : status === 'mining'
                  ? isPrimary
                    ? "bg-blue-500/80 border-2 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.8)]"
                    : isActivated
                    ? "bg-green-500/60 border border-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                    : "bg-gray-800/40 border border-gray-700/30"
                  : status === 'waiting'
                  ? isActivated
                    ? "bg-yellow-500/50 border border-yellow-500/70 shadow-[0_0_6px_rgba(234,179,8,0.5)]"
                    : "bg-gray-800/30 border border-gray-700/30"
                  : "bg-gray-900/30 border border-gray-800/20"
              )}
            >
              {/* Scanning pulse effect for deployed squares */}
              {hasDeployments && hasDeployment && isScanning && (
                <div className="absolute inset-0 bg-cyan-400/30 rounded-[2px] animate-pulse" />
              )}
              {/* Subtle pulse for active deployed squares */}
              {hasDeployments && hasDeployment && isPulsing && !isScanning && (
                <div className="absolute inset-0 bg-blue-400/20 rounded-[2px] animate-pulse" />
              )}
              {/* Original animation for non-deployed */}
              {isPrimary && status === 'mining' && !hasDeployments && (
                <div className="absolute inset-0 bg-blue-400/20 rounded-[2px] animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
      <div className="text-center mt-2">
        <span className={cn(
          "text-[10px] font-bold tracking-wider uppercase transition-colors",
          status === 'mining' ? "text-green-500 animate-pulse" :
          status === 'waiting' ? "text-yellow-500" :
          "text-muted-foreground"
        )}>
          {status === 'mining' ? "⚡ MINING" :
           status === 'waiting' ? "⏳ WAITING" :
           "IDLE"}
        </span>
      </div>
    </div>
  );
}

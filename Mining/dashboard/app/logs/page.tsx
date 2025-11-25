'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type LogType = 'combined' | 'error' | 'transactions';

interface LogResponse {
  logs: string[];
  totalLines: number;
  hasMore: boolean;
  logType: string;
  fileSize: number;
  lastModified: string;
  message?: string;
}

export default function LogsPage() {
  const [logType, setLogType] = useState<LogType>('combined');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [lines, setLines] = useState(100);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch logs with auto-refresh
  const { data, isLoading, error } = useQuery<LogResponse>({
    queryKey: ['logs', logType, lines],
    queryFn: async () => {
      const response = await fetch(`/api/logs?type=${logType}&lines=${lines}`);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      return response.json();
    },
    refetchInterval: isPaused ? false : 5000, // Refresh every 5 seconds
    refetchIntervalInBackground: false,
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.logs, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      setAutoScroll(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getLogLineColor = (line: string) => {
    if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
      return 'text-red-400';
    }
    if (line.includes('warn') || line.includes('Warn') || line.includes('WARN')) {
      return 'text-yellow-400';
    }
    if (line.includes('success') || line.includes('Success') || line.includes('✓')) {
      return 'text-green-400';
    }
    if (line.includes('info') || line.includes('Info') || line.includes('ℹ️')) {
      return 'text-blue-400';
    }
    return 'text-gray-300';
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-0">
        <div>
          <h1 className="text-3xl font-bold">Bot Logs</h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring of bot activity
          </p>
        </div>
        <div className="flex items-center gap-4">
          {data && (
            <div className="text-sm text-muted-foreground">
              <div>Lines: {data.totalLines.toLocaleString()}</div>
              <div>Size: {formatFileSize(data.fileSize)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Lines:</span>
            <select
              value={lines}
              onChange={(e) => setLines(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isPaused ? 'default' : 'outline'}
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </Button>
            <Button
              size="sm"
              variant={autoScroll ? 'default' : 'outline'}
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? '📌 Auto-scroll ON' : '📌 Auto-scroll OFF'}
            </Button>
          </div>

          <div className="ml-auto">
            <Badge variant={isPaused ? 'secondary' : 'default'}>
              {isPaused ? 'Paused' : `Live (updates every 5s)`}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Log Tabs */}
      <Tabs value={logType} onValueChange={(v) => setLogType(v as LogType)}>
        <TabsList className="grid w-full grid-cols-1 lg:grid-cols-3">
          <TabsTrigger value="combined">
            📋 All Logs
          </TabsTrigger>
          <TabsTrigger value="error">
            ❌ Errors
          </TabsTrigger>
          <TabsTrigger value="transactions">
            💸 Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value={logType} className="mt-4">
          <Card className="p-0 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading logs...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-400">
                Error loading logs: {error.message}
              </div>
            ) : data?.message ? (
              <div className="p-8 text-center text-muted-foreground">
                {data.message}
              </div>
            ) : (
              <div
                ref={containerRef}
                className="bg-gray-950 p-4 overflow-y-auto font-mono text-sm"
                style={{ maxHeight: '600px' }}
              >
                {data?.logs && data.logs.length > 0 ? (
                  <>
                    {data.logs.map((line, index) => (
                      <div
                        key={index}
                        className={`py-1 ${getLogLineColor(line)} hover:bg-gray-900 px-2 -mx-2 rounded`}
                      >
                        {line}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </>
                ) : (
                  <div className="text-muted-foreground text-center py-8">
                    No logs found
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info */}
      <Card className="p-4 bg-blue-950/20 border-blue-900">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">About Logs</p>
            <ul className="list-disc list-inside space-y-1 text-blue-300">
              <li><strong>All Logs:</strong> Complete bot activity including deployments, claims, swaps, and system messages</li>
              <li><strong>Errors:</strong> Error messages and warnings only</li>
              <li><strong>Transactions:</strong> On-chain transaction signatures for verification</li>
              <li>Logs update automatically every 5 seconds (can be paused)</li>
              <li>Auto-scroll follows new logs (can be disabled)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

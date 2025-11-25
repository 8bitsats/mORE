'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import { formatDistance } from 'date-fns';

async function fetchRounds() {
  const res = await fetch('/api/rounds?limit=20');
  if (!res.ok) throw new Error('Failed to fetch rounds');
  return res.json();
}

export default function Performance() {
  const { data, isLoading } = useQuery({
    queryKey: ['rounds'],
    queryFn: fetchRounds,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <Activity className="h-12 w-12 animate-pulse text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const rounds = data?.rounds || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Mining Rounds
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rounds.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No rounds found</p>
            ) : (
              <div className="overflow-x-auto -mx-2 lg:mx-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Round</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Motherlode</TableHead>
                    <TableHead className="text-xs">Deployed</TableHead>
                    <TableHead className="text-xs text-center">Squares</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rounds.map((round: any) => (
                    <TableRow key={round.round_id}>
                      <TableCell className="font-mono text-sm">{round.round_id}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistance(new Date(round.timestamp), new Date(), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="font-semibold text-primary text-sm">
                        {round.motherload?.toFixed(2)} ORB
                      </TableCell>
                      <TableCell className="text-sm">{round.deployed_amount?.toFixed(4)} SOL</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">{round.squares_deployed}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

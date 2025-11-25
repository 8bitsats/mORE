import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

const LOG_FILES = {
  combined: 'logs/combined.log',
  error: 'logs/error.log',
  transactions: 'logs/transactions.log',
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const logType = searchParams.get('type') || 'combined';
    const lines = parseInt(searchParams.get('lines') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate log type
    if (!LOG_FILES[logType as keyof typeof LOG_FILES]) {
      return NextResponse.json(
        { error: 'Invalid log type' },
        { status: 400 }
      );
    }

    const logPath = join(process.cwd(), '..', LOG_FILES[logType as keyof typeof LOG_FILES]);

    // Check if file exists
    try {
      const stats = await stat(logPath);

      // Read the entire file
      const content = await readFile(logPath, 'utf-8');
      const allLines = content.split('\n').filter(line => line.trim());

      // Get total line count
      const totalLines = allLines.length;

      // Apply offset and limit
      const startIndex = Math.max(0, totalLines - lines - offset);
      const endIndex = totalLines - offset;
      const selectedLines = allLines.slice(startIndex, endIndex);

      return NextResponse.json({
        logs: selectedLines,
        totalLines,
        hasMore: startIndex > 0,
        logType,
        fileSize: stats.size,
        lastModified: stats.mtime,
      });
    } catch (fileError: any) {
      if (fileError.code === 'ENOENT') {
        return NextResponse.json({
          logs: [],
          totalLines: 0,
          hasMore: false,
          logType,
          fileSize: 0,
          message: 'Log file not found. Logs will appear once the bot starts running.',
        });
      }
      throw fileError;
    }
  } catch (error) {
    console.error('Error reading logs:', error);
    return NextResponse.json(
      { error: 'Failed to read logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

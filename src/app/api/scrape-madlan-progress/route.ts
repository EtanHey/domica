import { NextRequest, NextResponse } from 'next/server';
import { progressTracker } from '@/lib/progress-tracker';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const progress = progressTracker.getProgress(sessionId);
    
    return NextResponse.json({
      progress: progress || null
    });

  } catch (error) {
    console.error('Progress check error:', error);
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}
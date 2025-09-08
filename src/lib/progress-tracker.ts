// Simple in-memory progress tracker for scraping operations
interface ProgressState {
  stage: 'urls' | 'scraping' | 'saving' | 'complete' | 'error';
  message: string;
  current?: number;
  total?: number;
  completed?: number;
  percentage?: number;
  error?: string;
  lastUpdated: number;
}

class ProgressTracker {
  private progressMap = new Map<string, ProgressState>();

  updateProgress(sessionId: string, progress: Omit<ProgressState, 'lastUpdated'>) {
    this.progressMap.set(sessionId, {
      ...progress,
      lastUpdated: Date.now()
    });
  }

  getProgress(sessionId: string): ProgressState | null {
    const progress = this.progressMap.get(sessionId);
    
    // Clean up old sessions (older than 5 minutes)
    if (progress && Date.now() - progress.lastUpdated > 5 * 60 * 1000) {
      this.progressMap.delete(sessionId);
      return null;
    }
    
    return progress || null;
  }

  clearProgress(sessionId: string) {
    this.progressMap.delete(sessionId);
  }

  // Helper method to calculate percentage based on stage and current/total
  calculatePercentage(stage: string, current?: number, total?: number): number {
    switch (stage) {
      case 'urls':
        return 10;
      case 'scraping':
        if (current && total) {
          return 10 + (current / total) * 80;
        }
        return 15;
      case 'saving':
        return 95;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  }
}

export const progressTracker = new ProgressTracker();
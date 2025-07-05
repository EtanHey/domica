import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// AI-DEV: API endpoint to trigger Python scraper
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    // Validate action
    const validActions = ['scrape', 'scrape-group', 'scrape-firecrawl', 'upload-images', 'analyze'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: ' + validActions.join(', ') },
        { status: 400 }
      );
    }

    // Determine which Python script to run
    let pythonScript: string;
    const args: string[] = [];

    switch (action) {
      case 'scrape':
        pythonScript = 'facebook_rental_scraper.py';
        if (config?.searchQuery) {
          args.push(`--query "${config.searchQuery}"`);
        }
        if (config?.location) {
          args.push(`--location "${config.location}"`);
        }
        break;

      case 'scrape-group':
        pythonScript = 'facebook_group_scraper.py';
        args.push('--json');
        args.push('--headless');
        if (config?.groupUrl) {
          args.push(`--group "${config.groupUrl}"`);
        }
        if (config?.maxPosts) {
          args.push(`--max-posts ${config.maxPosts}`);
        }
        break;

      case 'scrape-firecrawl':
        pythonScript = 'firecrawl_scraper.py';
        args.push('--json');
        if (config?.groupUrl) {
          args.push(`--group "${config.groupUrl}"`);
        }
        if (config?.maxPosts) {
          args.push(`--max-posts ${config.maxPosts}`);
        }
        break;

      case 'upload-images':
        pythonScript = 'uploadthing_integration.py';
        if (config?.rentalId) {
          args.push(`--rental-id "${config.rentalId}"`);
        }
        break;

      case 'analyze':
        pythonScript = 'rental_app_analysis.py';
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    // Construct the command
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const scriptsDir = path.join(process.cwd(), 'python_scripts');
    const scriptPath = path.join(scriptsDir, pythonScript);

    const command = `${pythonPath} "${scriptPath}" ${args.join(' ')}`;

    console.log('Executing command:', command);

    // Execute the Python script
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        // Pass environment variables to Python script
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
        UPLOADTHING_SECRET: process.env.UPLOADTHING_SECRET,
      },
    });

    // Check if stderr contains actual errors or just logging
    if (stderr && !stderr.includes('WARNING') && !stderr.includes('INFO')) {
      console.error('Python script error:', stderr);
      return NextResponse.json(
        { error: 'Script execution failed', details: stderr },
        { status: 500 }
      );
    }

    // Parse the output
    let result;
    try {
      // Try to parse as JSON first
      result = JSON.parse(stdout);
    } catch {
      // If not JSON, return as text
      result = { output: stdout };
    }

    return NextResponse.json({
      success: true,
      action,
      result,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if scraper is available
export async function GET() {
  try {
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const { stdout } = await execAsync(`${pythonPath} --version`);

    return NextResponse.json({
      available: true,
      pythonVersion: stdout.trim(),
      actions: ['scrape', 'upload-images', 'analyze'],
    });
  } catch {
    return NextResponse.json({
      available: false,
      error: 'Python not available',
    });
  }
}

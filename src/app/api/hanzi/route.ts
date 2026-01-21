import { NextRequest, NextResponse } from 'next/server';

const HANZIPY_SERVER_URL = process.env.HANZIPY_SERVER_URL || 'http://localhost:6002';

export interface HanziLookupResult {
  character: string;
  pinyin: string | null;
  definition: string | null;
  found: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { characters } = body;

    if (!characters || !Array.isArray(characters)) {
      return NextResponse.json(
        { error: 'Missing or invalid characters parameter' },
        { status: 400 }
      );
    }

    // Call the HanziPy server
    const response = await fetch(`${HANZIPY_SERVER_URL}/lookup/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ characters }),
    });

    if (!response.ok) {
      throw new Error(`HanziPy server error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error calling HanziPy server:', error);
    return NextResponse.json(
      { 
        error: 'Failed to connect to HanziPy server. Make sure the Python server is running.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  // Health check - verify HanziPy server is available
  try {
    const response = await fetch(`${HANZIPY_SERVER_URL}/health`);
    const data = await response.json();
    return NextResponse.json({
      status: 'ok',
      hanzipy_server: data
    });
  } catch {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'HanziPy server is not available. Start it with: python hanzipy_server/server.py'
      },
      { status: 503 }
    );
  }
}

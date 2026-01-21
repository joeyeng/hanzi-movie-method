import { NextRequest, NextResponse } from 'next/server';

const HANZIPY_SERVER_URL = process.env.HANZIPY_SERVER_URL || 'http://localhost:6002';

export interface ComponentResult {
  character: string;
  pinyin?: string;
  definition?: string;
}

export interface DecomposeResult {
  character: string;
  components: ComponentResult[];
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

    // Call the HanziPy server decompose batch endpoint
    const response = await fetch(`${HANZIPY_SERVER_URL}/decompose/batch`, {
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
    console.error('Error calling HanziPy decompose server:', error);
    return NextResponse.json(
      { 
        error: 'Failed to connect to HanziPy server for decomposition.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

const HANZIPY_SERVER_URL = process.env.HANZIPY_SERVER_URL || 'http://localhost:5000';

export interface SegmentResult {
  words: string[];
  compounds: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid text parameter' },
        { status: 400 }
      );
    }

    // Call the HanziPy server's segment endpoint
    const response = await fetch(`${HANZIPY_SERVER_URL}/segment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`HanziPy server error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error calling HanziPy segment endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to segment text. Make sure the Python server is running with jieba installed.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

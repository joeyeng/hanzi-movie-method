// API route to search for example sentences from Tatoeba database
import { NextRequest, NextResponse } from 'next/server';

const TATOEBA_SERVER_URL = process.env.TATOEBA_SERVER_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');
        const limit = searchParams.get('limit') || '5';

        if (!query) {
            return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
        }

        const response = await fetch(
            `${TATOEBA_SERVER_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            throw new Error(`Tatoeba server error: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Tatoeba API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch example sentences', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { queries, limit = 3 } = body;

        if (!queries || !Array.isArray(queries)) {
            return NextResponse.json({ error: 'Missing queries array' }, { status: 400 });
        }

        const response = await fetch(`${TATOEBA_SERVER_URL}/search/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queries, limit }),
        });

        if (!response.ok) {
            throw new Error(`Tatoeba server error: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Tatoeba API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch example sentences', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

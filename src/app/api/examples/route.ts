// API route for example sentences
// NOTE: Example sentences are now served from client-side offline database (hanzi_data.db)
// This route is kept for backward compatibility but returns an empty result
// The frontend uses offlineDb.ts directly instead of calling this API

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Return empty results - client should use offlineDb directly
    return NextResponse.json({
        results: [],
        count: 0,
        message: 'Example sentences are now served from client-side offline database. Use offlineDb.searchExamples() instead.'
    });
}

export async function POST(request: NextRequest) {
    // Return empty results - client should use offlineDb directly
    return NextResponse.json({
        results: {},
        message: 'Example sentences are now served from client-side offline database. Use offlineDb.batchSearchExamples() instead.'
    });
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔥 TEST API: This is a test log message');
  console.error('🔥 TEST API: This is a test error message');
  
  try {
    throw new Error('Test error for debugging');
  } catch (error) {
    console.error('🔥 TEST API: Caught error:', error);
    console.error('🔥 TEST API: Error message:', error instanceof Error ? error.message : String(error));
  }
  
  return NextResponse.json({ message: 'Test API working', timestamp: new Date().toISOString() });
}
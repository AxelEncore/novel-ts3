import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envVars = {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD ? '***скрыто***' : undefined,
      DB_SSL: process.env.DB_SSL,
      DATABASE_URL: process.env.DATABASE_URL ? '***скрыто***' : undefined,
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET ? '***скрыто***' : undefined
    };

    console.log('🔍 Environment variables in Next.js API:', envVars);

    return NextResponse.json({
      message: 'Environment variables debug',
      env: envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug env error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
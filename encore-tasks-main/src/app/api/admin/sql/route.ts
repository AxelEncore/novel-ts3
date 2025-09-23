import { NextRequest, NextResponse } from 'next/server';
import { DatabaseAdapter } from '@/lib/database-adapter';

const databaseAdapter = DatabaseAdapter.getInstance();
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Проверяем, что пользователь - администратор
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { sql } = await request.json();
    
    if (!sql) {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    console.log('Executing SQL:', sql);
    
    // Выполняем SQL запрос
    const result = await databaseAdapter.query(sql);
    
    return NextResponse.json({
      success: true,
      rows: result.rows,
      rowCount: result.rowCount
    });
    
  } catch (error) {
    console.error('SQL execution error:', error);
    return NextResponse.json(
      { error: 'SQL execution failed', details: error.message },
      { status: 500 }
    );
  }
}
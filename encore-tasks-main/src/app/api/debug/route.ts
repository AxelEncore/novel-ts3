import { NextRequest, NextResponse } from 'next/server';
import { DatabaseAdapter } from '@/lib/database-adapter';

const databaseAdapter = DatabaseAdapter.getInstance();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('DEBUG:', body);
    
    // Если это запрос на выполнение SQL
    if (body.action === 'execute_sql' && body.sql) {
      console.log('Executing SQL:', body.sql);
      
      try {
        const result = await databaseAdapter.query(body.sql);
        console.log('SQL result:', result);
        
        return NextResponse.json({ 
          success: true, 
          message: 'SQL executed successfully',
          rows: result.rows,
          rowCount: result.rowCount
        });
      } catch (sqlError) {
        console.error('SQL execution error:', sqlError);
        return NextResponse.json({ 
          error: 'SQL execution failed', 
          details: sqlError.message 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true, message: 'Debug message logged' });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}
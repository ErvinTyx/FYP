import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/health
 * Test database connectivity
 */
export async function GET() {
  console.log('[Health] Starting health check...');
  
  try {
    // Try a simple query
    console.log('[Health] Testing database connection...');
    const startTime = Date.now();
    
    // Use $queryRaw for a simple connectivity test
    await prisma.$queryRaw`SELECT 1 as test`;
    
    const duration = Date.now() - startTime;
    console.log(`[Health] Database connected successfully in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      message: 'Database connected',
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error('[Health] Database connection failed:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.name : 'Unknown',
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { validateUser } from '@/lib/services/sheetsService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile } = body;

    console.log('📱 Validation request for mobile:', mobile);

    if (!mobile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mobile number is required',
        },
        { status: 400 }
      );
    }

    // Validate mobile number format
    if (typeof mobile !== 'string' || mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid mobile number format. Must be 10 digits.',
        },
        { status: 400 }
      );
    }

    // Validate with Google Sheets
    const result = await validateUser(mobile);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('❌ Error in validation endpoint:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}


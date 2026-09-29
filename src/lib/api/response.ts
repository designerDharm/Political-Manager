import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  const requestId = crypto.randomUUID();
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
      requestId,
    },
    { status }
  );
}

export function apiError(code: string, message: string, status = 400, details?: unknown) {
  const requestId = crypto.randomUUID();
  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      requestId,
    },
    { status }
  );
}

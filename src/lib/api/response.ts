import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

export interface ApiErrorResponse {
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

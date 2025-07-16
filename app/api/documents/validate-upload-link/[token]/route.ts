import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  // Call the backend API to validate the token in real time
  const res = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/documents/validate-upload-link/${params.token}`);
  const data = await res.json();
  if (res.ok) {
    return NextResponse.json({ valid: true });
  } else {
    return NextResponse.json({ error: data.error || 'Invalid or expired link.' }, { status: res.status });
  }
} 
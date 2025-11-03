import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  // Call the backend API to validate the token in real time
  const backendUrl = process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:5000';
  const res = await fetch(`${backendUrl}/api/documents/validate-upload-link/${params.token}`);
  const data = await res.json();
  if (res.ok) {
    return NextResponse.json({ valid: true });
  } else {
    return NextResponse.json({ error: data.error || 'Invalid or expired link.' }, { status: res.status });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getBookingJob } from '@/lib/booking-jobs';

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

  const job = await getBookingJob(jobId);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(job);
}

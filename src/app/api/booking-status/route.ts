import { NextRequest, NextResponse } from 'next/server';
import { getBookingJob } from '@/lib/booking-jobs';
import { requireUser } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;

  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

  const job = await getBookingJob(jobId);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (job.userId && job.userId !== auth.user.uid) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  return NextResponse.json(job);
}

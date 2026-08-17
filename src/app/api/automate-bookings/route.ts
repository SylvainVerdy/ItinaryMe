import { NextRequest, NextResponse } from 'next/server';
import { getJobByStripeSession, updateJobStatus } from '@/lib/booking-jobs';
import { runDuffelBookings } from '@/lib/duffel-booking';
import { TravelerInfo } from '@/types/booking';
import { requireUser } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;

  const { sessionId, traveler }: { sessionId: string; traveler: TravelerInfo } = await req.json();

  if (!sessionId || !traveler?.email) {
    return NextResponse.json({ error: 'sessionId and traveler required' }, { status: 400 });
  }

  const job = await getJobByStripeSession(sessionId);
  if (!job || !job.id) {
    return NextResponse.json({ error: 'Booking job not found' }, { status: 404 });
  }
  // Authentifier ne suffit pas : il faut que le job appartienne à l'appelant,
  // sinon un utilisateur connecté pourrait déclencher les réservations d'un
  // autre à partir d'un identifiant de session.
  if (job.userId && job.userId !== auth.user.uid) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  if (job.status === 'completed' || job.status === 'in_progress') {
    return NextResponse.json({ error: 'Job already processed' }, { status: 409 });
  }

  await updateJobStatus(job.id, 'in_progress');

  runDuffelBookings(job.items, traveler)
    .then((results) => {
      const allOk = results.every((r) => r.status === 'success');
      return updateJobStatus(job.id!, allOk ? 'completed' : 'failed', results);
    })
    .catch(() => updateJobStatus(job.id!, 'failed'));

  return NextResponse.json({ jobId: job.id, status: 'in_progress' });
}

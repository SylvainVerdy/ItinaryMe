import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BookingJob, BookingResult } from '@/types/booking';

const COLLECTION = 'booking_jobs';

export async function createBookingJob(job: Omit<BookingJob, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), job);
  return ref.id;
}

export async function getBookingJob(id: string): Promise<BookingJob | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as BookingJob;
}

export async function getJobByStripeSession(sessionId: string): Promise<BookingJob | null> {
  const q = query(collection(db, COLLECTION), where('stripeSessionId', '==', sessionId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as BookingJob;
}

export async function updateJobStatus(
  id: string,
  status: BookingJob['status'],
  results?: BookingResult[],
) {
  const updates: Partial<BookingJob> = { status, updatedAt: new Date().toISOString() };
  if (results) updates.results = results;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, COLLECTION, id), updates as any);
}

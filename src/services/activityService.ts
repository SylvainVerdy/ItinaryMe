import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  // orderBy on single field only — composite index not needed
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Activity, ActivityInput } from '@/types/activity';

const activitiesCol = (tripId: string) =>
  collection(db, 'travels', tripId, 'activities');

export const activityService = {
  async getActivities(tripId: string): Promise<Activity[]> {
    const q = query(activitiesCol(tripId), orderBy('date'));
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        tripId,
        title: data.title,
        date: data.date,
        startTime: data.startTime ?? '',
        endTime: data.endTime ?? '',
        category: data.category,
        location: data.location ?? '',
        notes: data.notes ?? '',
        price: data.price ?? undefined,
        currency: data.currency ?? 'EUR',
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      } as Activity;
    });
    // Sort by startTime in JS to avoid composite index requirement
    return results.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
  },

  async addActivity(tripId: string, input: ActivityInput): Promise<string> {
    const docRef = await addDoc(activitiesCol(tripId), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async updateActivity(
    tripId: string,
    activityId: string,
    input: Partial<ActivityInput>
  ): Promise<void> {
    const ref = doc(db, 'travels', tripId, 'activities', activityId);
    await updateDoc(ref, { ...input, updatedAt: serverTimestamp() });
  },

  async deleteActivity(tripId: string, activityId: string): Promise<void> {
    const ref = doc(db, 'travels', tripId, 'activities', activityId);
    await deleteDoc(ref);
  },
};

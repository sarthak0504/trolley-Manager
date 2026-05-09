import { db } from '../config/firebase';
import { Trolley } from '@trolley/shared';

const col = (userId: string) => `users/${userId}/trolleys`;
const ref = (userId: string, trolleyId: string) => `users/${userId}/trolleys/${trolleyId}`;

export const trolleyRepository = {
  async findAll(userId: string): Promise<Trolley[]> {
    const snap = await db.collection(col(userId)).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trolley));
  },

  async findById(userId: string, trolleyId: string): Promise<Trolley | null> {
    const snap = await db.doc(ref(userId, trolleyId)).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Trolley;
  },

  async create(userId: string, trolley: Trolley): Promise<void> {
    await db.doc(ref(userId, trolley.id)).set(trolley);
  },

  async update(userId: string, trolleyId: string, data: Partial<Trolley>): Promise<void> {
    await db.doc(ref(userId, trolleyId)).update(data as FirebaseFirestore.UpdateData<Trolley>);
  },
};

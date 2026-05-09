import { db } from '../config/firebase';
import { Expense } from '@trolley/shared';

const col = (userId: string) => `users/${userId}/expenses`;
const ref = (userId: string, expenseId: string) => `users/${userId}/expenses/${expenseId}`;

export const expenseRepository = {
  async findAll(userId: string): Promise<Expense[]> {
    const snap = await db.collection(col(userId)).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
  },

  async findById(userId: string, expenseId: string): Promise<Expense | null> {
    const snap = await db.doc(ref(userId, expenseId)).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Expense;
  },

  async create(userId: string, data: Omit<Expense, 'id'>): Promise<Expense> {
    const docRef = await db.collection(col(userId)).add(data);
    return { id: docRef.id, ...data };
  },

  async update(userId: string, expenseId: string, data: Partial<Expense>): Promise<void> {
    await db
      .doc(ref(userId, expenseId))
      .update(data as FirebaseFirestore.UpdateData<Expense>);
  },

  async delete(userId: string, expenseId: string): Promise<void> {
    await db.doc(ref(userId, expenseId)).delete();
  },
};

import { db } from '../config/firebase';
import { Payment, CreatePaymentInput } from '@trolley/shared';

const col = (userId: string, clientId: string) =>
  `users/${userId}/clients/${clientId}/payments`;
const ref = (userId: string, clientId: string, paymentId: string) =>
  `users/${userId}/clients/${clientId}/payments/${paymentId}`;

export const paymentRepository = {
  async findAll(userId: string, clientId: string): Promise<Payment[]> {
    const snap = await db.collection(col(userId, clientId)).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
  },

  async findById(
    userId: string,
    clientId: string,
    paymentId: string,
  ): Promise<Payment | null> {
    const snap = await db.doc(ref(userId, clientId, paymentId)).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Payment;
  },

  async create(
    userId: string,
    clientId: string,
    data: CreatePaymentInput,
  ): Promise<Payment> {
    const docRef = await db.collection(col(userId, clientId)).add(data);
    await docRef.update({ id: docRef.id });
    return { id: docRef.id, ...data };
  },

  async update(
    userId: string,
    clientId: string,
    paymentId: string,
    data: Partial<Payment>,
  ): Promise<void> {
    await db
      .doc(ref(userId, clientId, paymentId))
      .set({ ...data, id: paymentId }, { merge: true });
  },

  async delete(userId: string, clientId: string, paymentId: string): Promise<void> {
    await db.doc(ref(userId, clientId, paymentId)).delete();
  },
};

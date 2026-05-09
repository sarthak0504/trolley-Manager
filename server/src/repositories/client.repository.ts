import { db } from '../config/firebase';
import { Client } from '@trolley/shared';

const col = (userId: string) => `users/${userId}/clients`;
const ref = (userId: string, clientId: string) => `users/${userId}/clients/${clientId}`;

export const clientRepository = {
  async findAll(userId: string): Promise<Client[]> {
    const snap = await db.collection(col(userId)).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client));
  },

  async findById(userId: string, clientId: string): Promise<Client | null> {
    const snap = await db.doc(ref(userId, clientId)).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Client;
  },

  async create(userId: string, data: Omit<Client, 'id'>): Promise<Client> {
    const docRef = await db.collection(col(userId)).add(data);
    return { id: docRef.id, ...data };
  },

  async update(userId: string, clientId: string, data: Partial<Client>): Promise<void> {
    await db.doc(ref(userId, clientId)).update(data as FirebaseFirestore.UpdateData<Client>);
  },

  async delete(userId: string, clientId: string): Promise<void> {
    await db.doc(ref(userId, clientId)).delete();
  },
};

import { firestore } from '../../../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';

const COLLECTION_NAME = 'technicians';

export const technicianService = {
  getAll: async () => {
    const q = query(collection(firestore, COLLECTION_NAME), orderBy('fullName'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  add: async (technician) => {
    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), {
      ...technician,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  update: async (id, technician) => {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...technician,
      updatedAt: serverTimestamp()
    });
  },

  delete: async (id) => {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};

import { firestore } from '../../../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy
} from 'firebase/firestore';

const COLLECTION_NAME = 'locations';

export const locationService = {
  async getAll() {
    try {
      const q = query(collection(firestore, COLLECTION_NAME), orderBy('fechaCreacion', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error in locationService.getAll:", error);
      throw error;
    }
  },

  async add(locationData) {
    const data = {
      ...locationData,
      fechaCreacion: new Date().toISOString(),
      estado: 'activa'
    };
    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), data);
    return docRef.id;
  },

  async update(id, locationData) {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await updateDoc(docRef, locationData);
  },

  async delete(id) {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};

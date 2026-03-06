import { firestore } from '../../../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';

const COLLECTION_NAME = 'vehicles';

export const vehicleService = {
  async getAllVehicles() {
    const q = query(collection(firestore, COLLECTION_NAME));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
  },

  async addVehicle(vehicleData) {
    const { id, ...data } = vehicleData;
    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async updateVehicle(id, updates) {
    const { id: _, ...data } = updates;
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async deleteVehicle(id) {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  async getVehiclesBySede(sedeId) {
    const q = query(collection(firestore, COLLECTION_NAME), where('sedeId', '==', sedeId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
  }
};

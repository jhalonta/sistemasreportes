import { firestore } from '@/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

const COLLECTION_NAME = 'activities';

export const activityService = {
  /**
   * Fetches all activities
   */
  async getAllActivities() {
    const q = query(collection(firestore, COLLECTION_NAME), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  /**
   * Fetches activities for a specific date
   * @param {string} dateString format YYYY-MM-DD
   */
  async getActivitiesByDate(dateString) {
    const q = query(
      collection(firestore, COLLECTION_NAME),
      where('date', '==', dateString)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  /**
   * Saves a new activity or multiple activities
   */
  async addActivity(data) {
    try {
      const docRef = await addDoc(collection(firestore, COLLECTION_NAME), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding activity:', error);
      throw error;
    }
  },

  /**
   * Updates an existing activity
   */
  async updateActivity(id, data) {
    try {
      const docRef = doc(firestore, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  },

  /**
   * Deletes an activity
   */
  async deleteActivity(id) {
    try {
      const docRef = doc(firestore, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }
};

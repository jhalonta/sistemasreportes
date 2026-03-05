import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { firestore } from '@/firebase';

const COLLECTION_NAME = 'attendances';

export const attendanceService = {
  /**
   * Fetches attendance for a specific date
   * @param {string} date - ISO date string (YYYY-MM-DD)
   */
  async getAttendanceByDate(date) {
    const q = query(
      collection(firestore, COLLECTION_NAME),
      where('date', '==', date)
    );
    const querySnapshot = await getDocs(q);
    const records = {};
    querySnapshot.forEach((doc) => {
      records[doc.data().technicianId] = {
        id: doc.id,
        ...doc.data()
      };
    });
    return records;
  },

  /**
   * Fetches attendance for a range of dates
   */
  async getAttendanceByDateRange(startDate, endDate) {
    const q = query(
      collection(firestore, COLLECTION_NAME),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const querySnapshot = await getDocs(q);
    const recordsByDate = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!recordsByDate[data.date]) recordsByDate[data.date] = {};
      recordsByDate[data.date][data.technicianId] = {
        id: doc.id,
        ...data
      };
    });
    return recordsByDate;
  },

  /**
   * Records or updates attendance for a technician
   */
  async saveAttendance(data) {
    const { id, ...rest } = data;
    const now = serverTimestamp();
    
    if (id) {
      // Update existing
      const docRef = doc(firestore, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...rest,
        updatedAt: now
      });
      return id;
    } else {
      // Create new
      const docRef = await addDoc(collection(firestore, COLLECTION_NAME), {
        ...rest,
        createdAt: now,
        updatedAt: now
      });
      return docRef.id;
    }
  },

  /**
   * Deletes an attendance record
   */
  async deleteAttendance(id) {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  /**
   * Batch mark multiple technicians as present
   */
  async markBulkAttendance(date, technicianIds) {
    const now = serverTimestamp();
    const promises = technicianIds.map(techId => {
      return addDoc(collection(firestore, COLLECTION_NAME), {
        technicianId: techId,
        date,
        status: 'present',
        checkIn: now,
        createdAt: now,
        updatedAt: now
      });
    });
    await Promise.all(promises);
  }
};

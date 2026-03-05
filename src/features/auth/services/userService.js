import { firestore, firebaseConfig } from '../../../firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const COLLECTION_NAME = 'users';

export const userService = {
  /**
   * Creates a new Firebase Auth user and a corresponding Firestore document in 'users' collection.
   * Uses a secondary app instance to prevent session hijacking of the current administrator.
   */
  /**
   * Creates a new Firebase Auth user and a corresponding Firestore document in 'users' collection.
   * Uses a secondary app instance to prevent session hijacking of the current administrator.
   */
  createUserAccount: async (email, password, role, extraData = {}) => {
    let secondaryApp;
    try {
      // 0. If it's a technician, check if user already exists for this technicianId
      if (extraData.technicianId) {
        const q = query(collection(firestore, COLLECTION_NAME), where('technicianId', '==', extraData.technicianId));
        const existing = await getDocs(q);
        if (!existing.empty) {
          throw new Error('Este técnico ya tiene una cuenta de usuario asignada.');
        }
      }

      // Create a secondary app to avoid logging out the current admin
      const appName = `Secondary-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);

      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = userCredential.user.uid;

      // Log out from secondary app immediately
      await signOut(secondaryAuth);

      // 2. Create document in 'users' collection using the same UID
      const userDocRef = doc(firestore, COLLECTION_NAME, uid);
      await setDoc(userDocRef, {
        email,
        role,
        ...extraData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return uid;
    } catch (error) {
      console.error('Error creating user account:', error);
      throw error;
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          console.warn('Error deleting secondary app:', e);
        }
      }
    }
  },

  /**
   * Retrieves user profile from Firestore by UID
   */
  getUserProfile: async (uid) => {
    const docRef = doc(firestore, COLLECTION_NAME, uid);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data();
    }
    return null;
  }
};

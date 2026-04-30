import { firestore, app } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

const COLLECTION_NAME = 'users';
const functions = getFunctions(app);

export const userService = {
  /**
   * Crea una cuenta de usuario sincronizada con Firebase Auth por medio de Cloud Functions
   */
  createUserAccount: async (email, password, role, extraData = {}) => {
    try {
      // Validación previa en frontend para rapidez del UX
      if (extraData.technicianId) {
        const q = query(
          collection(firestore, COLLECTION_NAME),
          where('technicianId', '==', extraData.technicianId)
        );
        const existing = await getDocs(q);
        if (!existing.empty) {
          throw new Error('Este técnico ya tiene una cuenta de usuario asignada.');
        }
      }

      const createUserAuth = httpsCallable(functions, 'createUserAuth');
      const result = await createUserAuth({
        email,
        password,
        role,
        extraData
      });
      
      return result.data.uid;
    } catch (error) {
      console.error('Error en createUserAccount:', error);
      throw error;
    }
  },

  /**
   * Lista todos los usuarios de la colección Firestore
   */
  listUsers: async () => {
    try {
      const snapshot = await getDocs(collection(firestore, COLLECTION_NAME));
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      throw error;
    }
  },

  /**
   * Actualiza datos de usuario y sincroniza con Auth si es necesario
   */
  updateUser: async (uid, data) => {
    try {
      const updateUserAuth = httpsCallable(functions, 'updateUserAuth');
      await updateUserAuth({ uid, data });
    } catch (error) {
      console.error('Error en updateUser:', error);
      throw error;
    }
  },

  /**
   * Elimina al usuario de Auth y Firestore
   */
  deleteUser: async (uid) => {
    try {
      const deleteUserAuth = httpsCallable(functions, 'deleteUserAuth');
      await deleteUserAuth({ uid });
    } catch (error) {
      console.error('Error en deleteUser:', error);
      throw error;
    }
  },

  /**
   * Obtiene el perfil de un usuario por su UID
   */
  getUserProfile: async (uid) => {
    try {
      const docRef = doc(firestore, COLLECTION_NAME, uid);
      const snapshot = await getDoc(docRef);
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      throw error;
    }
  }
};

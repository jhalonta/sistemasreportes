import { defineStore } from 'pinia';
import { ref } from 'vue';
import { userService } from '../services/userService';
import { firestore } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const useUserStore = defineStore('userStore', () => {
  const users = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchUsers = async () => {
    loading.value = true;
    try {
      const snapshot = await getDocs(collection(firestore, 'users'));
      users.value = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const createUserAccount = async (email, password, role, extraData = {}) => {
    loading.value = true;
    error.value = null;
    try {
      await userService.createUserAccount(email, password, role, extraData);
      // Refresh user list
      await fetchUsers();
      return { success: true };
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUserAccount
  };
});

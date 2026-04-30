import { defineStore } from 'pinia';
import { ref } from 'vue';
import { userService } from '../services/userService';

export const useUserStore = defineStore('userStore', () => {
  const users = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchUsers = async () => {
    loading.value = true;
    try {
      users.value = await userService.listUsers();
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
      await fetchUsers();
      return { success: true };
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const toggleUserStatus = async (uid, currentStatus) => {
    loading.value = true;
    try {
      await userService.updateUser(uid, { active: !currentStatus });
      await fetchUsers();
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteUser = async (uid) => {
    loading.value = true;
    try {
      await userService.deleteUser(uid);
      await fetchUsers();
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
    createUserAccount,
    toggleUserStatus,
    deleteUser
  };
});

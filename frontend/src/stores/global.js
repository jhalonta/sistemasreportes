import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGlobalStore = defineStore('global', () => {
  // Default to today
  const selectedDate = ref(new Date().toISOString().split('T')[0]);

  const getDateString = () => selectedDate.value;

  const setDate = (newDate) => {
    selectedDate.value = newDate;
  };

  return {
    selectedDate,
    getDateString,
    setDate
  };
});

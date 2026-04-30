import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGlobalStore = defineStore('global', () => {
  // Default to today (local time)
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedDate = ref(getLocalDateString());

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

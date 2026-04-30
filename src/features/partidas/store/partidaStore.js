import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { partidaService } from '../services/partidaService';

export const usePartidaStore = defineStore('partidas', () => {
    const partidas = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const categories = computed(() => {
        const cats = [...new Set(partidas.value.map(p => p.category))];
        return cats.sort();
    });

    const fetchPartidas = async () => {
        loading.value = true;
        error.value = null;
        try {
            partidas.value = await partidaService.getAll();
        } catch (err) {
            console.error('Error fetching partidas:', err);
            error.value = 'Error al cargar las partidas.';
        } finally {
            loading.value = false;
        }
    };

    const updatePartidaPrices = async (id, priceRural, priceUrban) => {
        loading.value = true;
        error.value = null;
        try {
            await partidaService.updatePrices(id, { priceRural, priceUrban });
            // Update local state
            const index = partidas.value.findIndex(p => p.id === id);
            if (index !== -1) {
                partidas.value[index] = {
                    ...partidas.value[index],
                    priceRural,
                    priceUrban,
                    updatedAt: new Date()
                };
            }
        } catch (err) {
            console.error('Error updating partida prices:', err);
            error.value = 'Error al actualizar los precios.';
            throw err;
        } finally {
            loading.value = false;
        }
    };

    return {
        partidas,
        categories,
        loading,
        error,
        fetchPartidas,
        updatePartidaPrices
    };
});

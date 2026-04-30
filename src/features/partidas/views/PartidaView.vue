<script setup>
import { onMounted, ref, computed } from 'vue';
import { usePartidaStore } from '../store/partidaStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import PartidaFilters from '../components/PartidaFilters.vue';
import PartidaList from '../components/PartidaList.vue';
import { Tag } from 'lucide-vue-next';

const partidaStore = usePartidaStore();
const authStore = useAuthStore();

const searchQuery = ref('');
const selectedCategory = ref('all');

onMounted(() => {
    partidaStore.fetchPartidas();
});

const isAdmin = computed(() => authStore.userProfile?.role === 'admin');

const filteredPartidas = computed(() => {
    const query = searchQuery.value.toLowerCase();
    return partidaStore.partidas.filter(p => {
        const matchesQuery = p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query);
        const matchesCategory = selectedCategory.value === 'all' || p.category === selectedCategory.value;
        return matchesQuery && matchesCategory;
    });
});

const handleUpdatePrices = async (id, priceRural, priceUrban) => {
    try {
        await partidaStore.updatePartidaPrices(id, priceRural, priceUrban);
    } catch (err) {
        // Error is handled in store
    }
};
</script>

<template>
    <div class="flex flex-1 flex-col gap-4 p-4 pt-2 min-w-0 overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-base font-bold tracking-tight flex items-center gap-2">
                    <Tag :size="18" class="text-primary" />
                    Listado de Partidas / Tarifarios
                </h1>
                <p class="text-[11px] text-muted-foreground mt-0.5">
                    Gestiona los códigos de servicio y sus respectivos precios base.
                </p>
            </div>
        </div>

        <!-- Filters -->
        <PartidaFilters v-model:searchQuery="searchQuery" v-model:selectedCategory="selectedCategory"
            :categories="partidaStore.categories" />

        <!-- List -->
        <PartidaList :partidas="filteredPartidas" :isAdmin="isAdmin" :loading="partidaStore.loading"
            @update-prices="handleUpdatePrices" />
    </div>
</template>

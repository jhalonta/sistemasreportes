<script setup>
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-vue-next';
import { useVModel } from '@vueuse/core';

const props = defineProps({
    searchQuery: { type: String, default: '' },
    selectedCategory: { type: String, default: 'all' },
    categories: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:searchQuery', 'update:selectedCategory']);

const searchModel = useVModel(props, 'searchQuery', emit);
const categoryModel = useVModel(props, 'selectedCategory', emit);
</script>

<template>
    <Card>
        <CardContent class="p-2 flex flex-col sm:flex-row items-center gap-2">
            <!-- Search -->
            <div class="relative flex-1 w-full">
                <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" :size="13" />
                <Input v-model="searchModel" placeholder="Buscar por código o nombre..."
                    class="h-8 pl-8 text-xs bg-background" />
            </div>

            <!-- Category Filter -->
            <div class="w-full sm:w-64 shrink-0">
                <Select v-model="categoryModel">
                    <SelectTrigger class="h-8 text-xs w-full overflow-hidden">
                        <SelectValue placeholder="Todas las Categorías" class="truncate" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Categorías</SelectItem>
                        <SelectItem v-for="cat in categories" :key="cat" :value="cat">
                            <span class="truncate block w-full">{{ cat }}</span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
    </Card>
</template>

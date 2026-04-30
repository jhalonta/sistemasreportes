<script setup>
import { cn } from '@/lib/utils';
import { Label } from 'reka-ui';

const props = defineProps({
    for: String,
    class: String,
});
</script>

<template>
    <Label :for="props.for" :class="cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        props.class,
    )
        ">
        <slot />
    </Label>
</template>

<script setup lang="ts">
    import { ref, watch } from "vue";
    import { fetchCity } from "../api/cities";

    const props = defineProps<{ city: string; state: string }>();

    const data = ref<any>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function load() {
    if (!props.city || !props.state) return;

    loading.value = true;
    error.value = null;
    data.value = null;

    try {
        data.value = await fetchCity(props.state, props.city);
    } catch {
        error.value = "Failed to load city info";
    } finally {
        loading.value = false;
    }
    }

    watch(
        () => [props.city, props.state],
        ([city, state]) => {
            if (!city || !state) return;
            load();
        },
        { immediate: true }
    );
</script>

<template>
    <div class="city-info-row">
        <p v-if="loading" class="muted">Loading…</p>
        <p v-else-if="error" class="muted">{{ error }}</p>

        <template v-else-if="data">
            <div class="city-info-stat">
                <span class="city-info-stat__label">City</span>
                <span class="city-info-stat__value">{{ data.name }}</span>
            </div>
            <div class="city-info-stat">
                <span class="city-info-stat__label">County</span>
                <span class="city-info-stat__value">{{ data.county }}</span>
            </div>
            <div class="city-info-stat">
                <span class="city-info-stat__label">Population</span>
                <span class="city-info-stat__value city-info-stat__value--big">
                    {{ data.population.toLocaleString() }}
                </span>
            </div>
        </template>
    </div>
</template>

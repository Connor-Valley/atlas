<script setup lang="ts">
    import { ref, watch } from "vue";
    import { fetchCity } from "../api/cities";
    import Section from "./Section.vue";

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
    <Section :toggle="false" title="City Info">
        <p v-if="loading">Loading…</p>
        <p v-else-if="error">{{ error }}</p>

        <div v-else-if="data" class="stat-grid">
            <div class="stat">
                <label>City:</label>
                <strong>{{ data.name }}</strong>
            </div>

            <div class="stat">
                <label>County:</label>
                <strong>{{ data.county }}</strong>
            </div>

            <div class="stat">
                <label>Population</label>
                <strong>{{ data.population.toLocaleString() }}</strong>
            </div>
        </div>
    </Section>
</template>

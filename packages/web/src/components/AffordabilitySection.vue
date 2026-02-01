<script setup lang="ts">
    import { ref, watch } from "vue";
    import { fetchAffordability } from "../api/affordability";
    import Section from "./Section.vue";

    const props = defineProps<{
    city: string;
    state: string;
    }>();

    const data = ref<any>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function load() {
    if (!props.city || !props.state) return;

    loading.value = true;
    error.value = null;
    data.value = null;

    try {
        data.value = await fetchAffordability(props.state, props.city);
    } catch {
        error.value = "Failed to load affordability data";
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
    <Section title="Affordability">
        <p v-if="loading">Loading…</p>
        <p v-else-if="error">{{ error }}</p>

        <div v-else-if="data" class="stat-grid">
            <div class="stat">
                <label>Median Rent</label>
                <strong>${{ data.medianRent }}</strong>
            </div>

            <div class="stat">
                <label>Median Renter Income</label>
                <strong>${{ data.medianRenterIncome }}</strong>
            </div>

            <div class="stat">
                <label>Rent / Income</label>
                <strong>{{ (data.rentToIncomeRatio * 100).toFixed(1) }}%</strong>
            </div>

            <div class="stat">
                <label>Affordability Status</label>
                <strong>{{ data.affordability }}</strong>
            </div>
        </div>
    </Section>
</template>

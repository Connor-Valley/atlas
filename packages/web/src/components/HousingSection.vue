<script setup lang="ts">
    import { ref, watch } from "vue";
    import { useRouter } from "vue-router";
    import { fetchHousing } from "../api/housing";
    import Section from "./Section.vue";

    const props = defineProps<{ city: string; state: string }>();
    const router = useRouter();

    // control open state explicitly so the section starts closed and still toggles
    const open = ref(false);

    const data = ref<any>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function load() {
        if (!props.city || !props.state) return;

        loading.value = true;
        error.value = null;
        data.value = null;

        try {
            data.value = await fetchHousing(props.state, props.city);
            console.log("Housing data:", data.value)
        } catch {
            error.value = "Failed to load housing data";
        } finally {
            loading.value = false;
        }
    }

    function navigateToHousingDetails() {
        router.push(`/housing/${props.state}/${props.city}`);
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
    <Section v-model="open" :toggle="true" title="Housing">
        <template #header-action>
            <button
                v-if="data && !loading && !error"
                @click="navigateToHousingDetails"
                class="section-action"
            >
                View Details →
            </button>
        </template>

        <p v-if="loading">Loading…</p>
        <p v-else-if="error">{{ error }}</p>

        <div v-else-if="data" class="stat-grid">
            <div class="stat">
                <label>Median Rent</label>
                <strong>${{ data.housing.medianRent }}</strong>
            </div>

            <div class="stat">
                <label>Renter Share</label>
                <strong>{{ (data.housing.renterShare * 100).toFixed(1) }}%</strong>
            </div>

            <div class="stat" v-if="data.medianHomeValue">
                <label>Median Home Value</label>
                <strong>${{ data.housing.medianHomeValue }}</strong>
            </div>
        </div>
    </Section>
</template>

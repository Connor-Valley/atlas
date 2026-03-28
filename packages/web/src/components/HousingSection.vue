<script setup lang="ts">
    import { ref, watch } from "vue";
    import { useRouter } from "vue-router";
    import { fetchHousing } from "../api/housing";
    import Section from "./Section.vue";

    const props = defineProps<{ city: string; state: string }>();
    const router = useRouter();

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
        } catch {
            error.value = "Failed to load housing data";
        } finally {
            loading.value = false;
        }
    }

    function navigateToHousingDetails() {
        router.push({
            name: 'housing',
            params: {
                state: props.state,
                city: props.city
            }
        });
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
    <Section :toggle="false" title="Housing" accent="housing">
        <p v-if="loading">Loading…</p>
        <p v-else-if="error">{{ error }}</p>

        <template v-else-if="data">
            <div class="stat-grid">
                <div class="stat">
                    <label>Median Rent</label>
                    <strong>${{ data.housing.medianRent.toLocaleString() }}</strong>
                </div>

                <div class="stat">
                    <label>Renter Share</label>
                    <strong>{{ (data.housing.renterShare * 100).toFixed(1) }}%</strong>
                </div>

                <div class="stat" v-if="data.housing.medianHomeValue">
                    <label>Home Value</label>
                    <strong>${{ data.housing.medianHomeValue.toLocaleString() }}</strong>
                </div>
            </div>

            <div class="section-footer">
                <button class="section-footer-link" @click="navigateToHousingDetails">
                    View Details →
                </button>
            </div>
        </template>
    </Section>
</template>

<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from "vue";
import { fetchDetailedCityProfile } from "../api/cityProfile";
import { fetchDetailedQualityOfLife } from "../api/qualityOfLife";

const props = defineProps<{ city: string; state: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const profile = ref<any>(null);
const qol     = ref<any>(null);
const loading = ref(false);
const error   = ref<string | null>(null);

async function load() {
  if (!props.city || !props.state) return;
  loading.value = true;
  error.value   = null;
  profile.value = null;
  qol.value     = null;
  try {
    [profile.value, qol.value] = await Promise.all([
      fetchDetailedCityProfile(props.state, props.city),
      fetchDetailedQualityOfLife(props.state, props.city),
    ]);
  } catch {
    error.value = "Failed to load city details";
  } finally {
    loading.value = false;
  }
}

watch(() => [props.city, props.state], load, { immediate: true });

// ── Derived values ────────────────────────────────────────────────────────────
const cityDisplayName = computed(() =>
  props.city.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
);
const pop         = computed(() => profile.value?.population.toLocaleString());
const medianAge   = computed(() => profile.value?.medianAge);
const ageLabel    = computed(() => {
  const a = medianAge.value;
  if (!a) return null;
  if (a < 33) return 'one of the younger cities in the country';
  if (a < 38) return 'a relatively young city';
  if (a < 44) return 'a mid-age city';
  return 'a more mature city';
});
const remoteShare  = computed(() => profile.value?.remoteWorkShare != null ? Math.round(profile.value.remoteWorkShare * 100) : null);
const renterShare  = computed(() => profile.value?.renterShare != null ? Math.round(profile.value.renterShare * 100) : null);
const ownerShare   = computed(() => profile.value?.ownerShare != null ? Math.round(profile.value.ownerShare * 100) : null);
const foreignBorn  = computed(() => profile.value?.foreignBornShare != null ? (profile.value.foreignBornShare * 100).toFixed(1) : null);
const unemployment = computed(() => qol.value?.unemploymentRate?.value != null ? (qol.value.unemploymentRate.value * 100).toFixed(1) : null);
const laborPartic  = computed(() => qol.value?.laborForceParticipationRate?.value != null ? (qol.value.laborForceParticipationRate.value * 100).toFixed(1) : null);
const eduHeadline  = computed(() => profile.value?.educationHeadline ?? null);
const commuteMin   = computed(() => profile.value?.meanCommuteMinutes ?? null);
const airport      = computed(() => qol.value?.nearestMajorAirport?.value ?? null);
const bachelorsPlus = computed(() => {
  const att = profile.value?.educationalAttainment;
  if (!att?.length) return null;
  const bachelors = att.find((e: any) => e.label === "Bachelor's degree")?.share ?? 0;
  const graduate = att.find((e: any) => e.label === "Graduate degree")?.share ?? 0;
  const total = Math.round((bachelors + graduate) * 100);
  return total > 0 ? `${total}%` : null;
});
const mobileSummary = computed(() => {
  if (!pop.value) return null;
  if (medianAge.value != null) {
    return `${cityDisplayName.value} has ${pop.value} residents and a median age of ${medianAge.value}.`;
  }
  return `${cityDisplayName.value} has ${pop.value} residents.`;
});
const mobileHighlights = computed(() => {
  const rows = [
    bachelorsPlus.value
      ? { label: "Bachelors or Higher", value: bachelorsPlus.value }
      : (eduHeadline.value ? { label: 'Education', value: eduHeadline.value } : null),
    renterShare.value != null
      ? { label: 'Renter share', value: `${renterShare.value}%` }
      : (laborPartic.value != null ? { label: 'Labor force', value: `${laborPartic.value}%` } : null),
    unemployment.value != null
      ? { label: 'Unemployment', value: `${unemployment.value}%` }
      : (remoteShare.value != null ? { label: 'Remote work', value: `${remoteShare.value}%` } : null),
    commuteMin.value != null
      ? { label: 'Commute', value: `${commuteMin.value} min` }
      : (foreignBorn.value != null ? { label: 'Foreign-born', value: `${foreignBorn.value}%` } : null),
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return rows;
});
const mobileEconomyStats = computed(() => {
  const rows = [
    laborPartic.value != null ? { label: 'Labor force', value: `${laborPartic.value}%`, pct: Number(laborPartic.value), isIcon: false } : null,
    unemployment.value != null ? { label: 'Unemployment', value: `${unemployment.value}%`, pct: 0, isIcon: true, iconClass: 'mdi-briefcase-search-outline' } : null,
    ownerShare.value != null ? { label: 'Homeowners', value: `${ownerShare.value}%`, pct: ownerShare.value, isIcon: false } : null,
    renterShare.value != null ? { label: 'Renters', value: `${renterShare.value}%`, pct: renterShare.value, isIcon: false } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; pct: number; isIcon: boolean; iconClass?: string }>;

  return rows;
});

const AIRLINE_COLORS: Record<string, { bg: string; text: string }> = {
  "Delta":     { bg: "#2B5EAD66", text: "#ffffff" },
  "United":    { bg: "#2B5EE066", text: "#ffffff" },
  "American":  { bg: "#C8102E66", text: "#ffffff" },
  "Southwest": { bg: "#D4970A66", text: "#ffffff" },
  "Alaska":    { bg: "#0D6E9E66", text: "#ffffff" },
  "JetBlue":   { bg: "#1A6FD466", text: "#ffffff" },
  "Hawaiian":  { bg: "#7B3FAE66", text: "#ffffff" },
  "Frontier":  { bg: "#3D9E3866", text: "#ffffff" },
  "Spirit":    { bg: "#B8960066", text: "#ffffff" },
};

function airlineTooltip(code: string, airline: string): string {
  return `${code} is a ${airline} hub`;
}

function airlineStyle(airline: string) {
  const colors = AIRLINE_COLORS[airline];
  if (!colors) return {};
  return { backgroundColor: colors.bg, color: colors.text };
}

const airportCardRef = ref<HTMLElement | null>(null);
const tooltipState = ref<{ text: string; x: number; y: number; color: string } | null>(null);

const tooltipFixedStyle = computed((): CSSProperties => {
  if (!tooltipState.value) return {};
  const { x, y, color } = tooltipState.value;
  return { left: `${x}px`, top: `${y}px`, transform: 'translateX(-50%)', '--airline-color': color } as CSSProperties;
});

function showTooltip(e: MouseEvent, airline: string, idx: number) {
  const code = airport.value?.code ?? '';
  const tagRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const solidColor = (AIRLINE_COLORS[airline]?.bg ?? '#66666666').slice(0, 7);
  tooltipState.value = {
    text: airlineTooltip(code, airline),
    x: tagRect.left + tagRect.width / 2,
    y: tagRect.bottom + 10,
    color: solidColor,
  };
}

function hideTooltip() {
  tooltipState.value = null;
}

// ── Dominant commute mode ─────────────────────────────────────────────────────
const topCommuteMode = computed(() => {
  const modes = profile.value?.commuteModes;
  if (!modes?.length) return null;
  return modes.reduce((a: any, b: any) => a.share > b.share ? a : b);
});

const commuteNarrativeHtml = computed(() => {
  const top = topCommuteMode.value;
  const remote = remoteShare.value;
  if (!top) return null;
  const pct = Math.round(top.share * 100);
  let s = `<span class="city-exp__accent">${pct}%</span> of residents ${
    top.label === 'Drove alone'
      ? 'drive alone'
      : top.label === 'Public transit'
        ? 'utilize public transit'
        : top.label.toLowerCase()
  }`;
  if (remote && remote >= 15 && top.label !== 'Worked from home') {
    s += `, and <span class="city-exp__accent">${remote}%</span> work entirely from home`;
  }
  if (commuteMin.value) {
    s += `. The average commute is <span class="city-exp__accent">${commuteMin.value} minutes</span>`;
  }
  return s + '.';
});

// ── Education narrative ───────────────────────────────────────────────────────
const educationNarrativeHtml = computed(() => {
  const p = profile.value;
  if (!p) return null;
  const graduate = p.educationalAttainment?.find((e: any) => e.label === "Graduate degree");
  const gPct = graduate ? Math.round(graduate.share * 100) : null;
  const headline = eduHeadline.value;
  if (!headline) return null;
  let s = `<span class="city-exp__accent">${headline.charAt(0).toUpperCase() + headline.slice(1)}</span>`;
  if (gPct && gPct >= 15) {
    s += `, including <span class="city-exp__accent">${gPct}%</span> with a graduate degree`;
  }
  return s + '.';
});

// ── Age distribution donut ────────────────────────────────────────────────────
const DONUT_R = 45;
const DONUT_C = 2 * Math.PI * DONUT_R;
const DONUT_GAP = 2;
const AGE_COLORS = ['#14B8A6', '#0891b2', '#6366f1', '#8b5cf6', '#f59e0b'];

const ageSegments = computed(() => {
  const dist = profile.value?.ageDistribution;
  if (!dist?.length) return [];
  let offset = 0;
  return dist.map((d: any, i: number) => {
    const full = d.share * DONUT_C;
    const dash = Math.max(0, full - DONUT_GAP);
    const dashOffset = -offset * DONUT_C;
    offset += d.share;
    return { label: d.label, pct: (d.share * 100).toFixed(1), color: AGE_COLORS[i % AGE_COLORS.length], dash, dashOffset };
  });
});

const dominantAge = computed(() => {
  const dist = profile.value?.ageDistribution;
  if (!dist?.length) return null;
  const top = dist.reduce((a: any, b: any) => a.share > b.share ? a : b);
  return { label: top.label, pct: (top.share * 100).toFixed(0) };
});

const ageNarrativeHtml = computed(() => {
  const d = dominantAge.value;
  if (!d) return null;
  return `The largest age group is <span class="city-exp__accent">${d.label}</span> at <span class="city-exp__accent">${d.pct}%</span> of residents.`;
});

// ── Education bars ────────────────────────────────────────────────────────────
const educationBars = computed(() => {
  const att = profile.value?.educationalAttainment;
  if (!att?.length) return [];
  const max = Math.max(...att.map((e: any) => e.share));
  return att.map((e: any) => ({
    label: e.label,
    pct: max > 0 ? (e.share / max) * 100 : 0,
    value: (e.share * 100).toFixed(1) + '%',
  }));
});

// ── Commute bars (top 3 only) ─────────────────────────────────────────────────
const commuteBars = computed(() => {
  const modes = profile.value?.commuteModes;
  if (!modes?.length) return [];
  const max = Math.max(...modes.map((m: any) => m.share));
  return [...modes]
    .sort((a: any, b: any) => b.share - a.share)
    .slice(0, 4)
    .filter((m: any) => m.share > 0.01)
    .map((m: any) => ({
      label: m.label,
      pct: max > 0 ? (m.share / max) * 100 : 0,
      value: (m.share * 100).toFixed(1) + '%',
    }));
});
</script>

<template>
  <div class="city-exp">

    <!-- Loading -->
    <template v-if="loading">
      <div class="city-exp__portrait city-exp__portrait--loading data-card">
        <span class="skeleton-line" style="width:75%;height:20px;display:block;margin-bottom:12px"></span>
        <span class="skeleton-line" style="width:90%;height:16px;display:block;margin-bottom:8px"></span>
        <span class="skeleton-line" style="width:60%;height:16px;display:block;margin-bottom:8px"></span>
        <span class="skeleton-line" style="width:50%;height:16px;display:block"></span>
      </div>
      <div class="city-exp__grid">
        <section v-for="i in 4" :key="i" class="data-card housing-exp__panel housing-exp__panel--compact">
          <div class="housing-exp__panel-head">
            <span class="skeleton-line" style="width:18px;height:18px;display:block;border-radius:4px"></span>
            <span class="skeleton-line" style="width:100px;height:14px;display:block"></span>
          </div>
          <span class="skeleton-line" style="width:85%;height:14px;display:block;margin-bottom:16px"></span>
          <div class="bar-list">
            <div v-for="j in 3" :key="j" class="bar-list__row">
              <span class="skeleton-line" style="width:100px;height:13px;display:block"></span>
              <div class="bar-list__track"><div class="bar-list__fill bar-list__fill--skeleton" :style="{width:(90-j*18)+'%'}"></div></div>
              <span class="skeleton-line" style="width:32px;height:13px;display:block"></span>
            </div>
          </div>
        </section>
      </div>
    </template>

    <!-- Error -->
    <div v-else-if="error" class="housing-exp__state"><p class="muted">{{ error }}</p></div>

    <!-- Data -->
    <template v-else-if="profile">

      <!-- Portrait -->
      <div class="city-exp__portrait data-card">
        <div class="city-exp__portrait-desktop">
          <p class="city-exp__lead">
            <span class="city-exp__city-name">{{ cityDisplayName }}</span>
            is home to
            <span class="city-exp__accent">{{ pop }}</span>
            residents
            <template v-if="medianAge"> with a median age of <span class="city-exp__accent">{{ medianAge }}</span>, {{ ageLabel }}</template>.
          </p>
          <p v-if="eduHeadline" class="city-exp__body">
            <span class="city-exp__accent">{{ eduHeadline.charAt(0).toUpperCase() + eduHeadline.slice(1) }}</span>,
            reflecting a highly skilled, knowledge-economy workforce.
          </p>
          <p v-if="renterShare" class="city-exp__body">
            <span class="city-exp__accent">{{ renterShare }}%</span> of households rent
            <template v-if="remoteShare && remoteShare >= 15">, and <span class="city-exp__accent">{{ remoteShare }}%</span> work entirely from home</template>
            <template v-if="foreignBorn">, and <span class="city-exp__accent">{{ foreignBorn }}%</span> of residents were born outside the US</template>.
          </p>
          <p v-if="unemployment" class="city-exp__body">
            The local unemployment rate stands at <span class="city-exp__accent">{{ unemployment }}%</span>
            <template v-if="laborPartic">, with <span class="city-exp__accent">{{ laborPartic }}%</span> of working-age adults active in the labor force</template>.
          </p>
        </div>

        <div class="city-exp__portrait-mobile">
          <p v-if="mobileSummary" class="city-exp__lead city-exp__lead--mobile">
            <span class="city-exp__city-name">{{ cityDisplayName }}</span>
            has
            <span class="city-exp__accent">{{ pop }}</span>
            residents
            <template v-if="medianAge != null"> and a median age of <span class="city-exp__accent">{{ medianAge }}</span></template>.
          </p>
          <div v-if="mobileHighlights.length" class="city-exp__mini-stats">
            <div v-for="row in mobileHighlights" :key="row.label" class="city-exp__mini-stat">
              <span class="city-exp__mini-stat-label">{{ row.label }}</span>
              <span class="city-exp__mini-stat-value">{{ row.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grid -->
      <div class="city-exp__grid">

        <!-- Age -->
        <section v-if="ageSegments.length" class="data-card housing-exp__panel housing-exp__panel--compact">
          <div class="housing-exp__panel-head">
            <span class="data-card__icon mdi mdi-account-group-outline"></span>
            <span class="housing-exp__panel-title">Who Lives Here</span>
          </div>
          <p v-if="ageNarrativeHtml" class="city-exp__panel-narrative">
            <template v-if="medianAge">Median age is <span class="city-exp__accent">{{ medianAge }}</span>. </template><span v-html="ageNarrativeHtml"></span>
          </p>
          <div class="struct-donut-wrap" style="margin-top: 12px;">
            <svg viewBox="0 0 120 120" class="struct-donut" aria-hidden="true">
              <circle cx="60" cy="60" r="45" fill="none" stroke="var(--border-card)" stroke-width="20"/>
              <circle
                v-for="seg in ageSegments" :key="seg.label"
                cx="60" cy="60" r="45" fill="none"
                :stroke="seg.color" stroke-width="20" stroke-linecap="butt"
                :stroke-dasharray="`${seg.dash} ${DONUT_C}`"
                :stroke-dashoffset="seg.dashOffset"
                style="transform:rotate(-90deg);transform-origin:60px 60px;"
              />
            </svg>
            <div class="struct-legend struct-legend--vertical">
              <div v-for="seg in ageSegments" :key="seg.label" class="struct-legend__item">
                <span class="struct-legend__dot" :style="{background:seg.color}"></span>
                <span class="struct-legend__label">{{ seg.label }}</span>
                <span class="struct-legend__pct">{{ seg.pct }}%</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Getting around -->
        <section v-if="commuteBars.length" class="data-card housing-exp__panel housing-exp__panel--compact">
          <div class="housing-exp__panel-head">
            <span class="data-card__icon mdi mdi-car-outline"></span>
            <span class="housing-exp__panel-title">Getting Around</span>
          </div>
          <p v-if="commuteNarrativeHtml" class="city-exp__panel-narrative" v-html="commuteNarrativeHtml"></p>
          <div class="bar-list bar-list--wide" style="margin-top: 14px;">
            <div v-for="bar in commuteBars" :key="bar.label" class="bar-list__row">
              <span class="bar-list__label">{{ bar.label }}</span>
              <div class="bar-list__track"><div class="bar-list__fill" :style="{width:bar.pct+'%'}"></div></div>
              <span class="bar-list__value">{{ bar.value }}</span>
            </div>
          </div>
        </section>

        <!-- Education -->
        <section v-if="educationBars.length" class="data-card housing-exp__panel housing-exp__panel--compact">
          <div class="housing-exp__panel-head">
            <span class="data-card__icon mdi mdi-school-outline"></span>
            <span class="housing-exp__panel-title">Education</span>
          </div>
          <p v-if="educationNarrativeHtml" class="city-exp__panel-narrative" v-html="educationNarrativeHtml"></p>
          <div class="bar-list" style="margin-top: 14px;">
            <div v-for="bar in educationBars" :key="bar.label" class="bar-list__row">
              <span class="bar-list__label">{{ bar.label }}</span>
              <div class="bar-list__track"><div class="bar-list__fill" :style="{width:bar.pct+'%'}"></div></div>
              <span class="bar-list__value">{{ bar.value }}</span>
            </div>
          </div>
        </section>

        <!-- Economy -->
        <section v-if="qol" class="data-card housing-exp__panel housing-exp__panel--compact">
          <div class="housing-exp__panel-head">
            <span class="data-card__icon mdi mdi-briefcase-outline"></span>
            <span class="housing-exp__panel-title">Economy &amp; Life</span>
          </div>
          <div class="city-exp__economy">
            <div v-if="mobileEconomyStats.length" class="city-exp__economy-mobile-stats">
              <div v-for="(stat, si) in mobileEconomyStats" :key="stat.label" class="city-exp__economy-mini">
                <template v-if="stat.isIcon">
                  <span :class="`mdi ${stat.iconClass} city-exp__economy-icon`"></span>
                </template>
                <template v-else>
                  <svg viewBox="0 0 34 34" class="city-exp__arc-svg" aria-hidden="true">
                    <defs>
                      <linearGradient :id="`arc-g-${si}`" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#5eead4"/>
                        <stop offset="100%" stop-color="#0d9488"/>
                      </linearGradient>
                    </defs>
                    <circle cx="17" cy="17" r="13" fill="none" stroke="var(--border-card)" stroke-width="3.5"/>
                    <circle
                      cx="17" cy="17" r="13" fill="none"
                      :stroke="`url(#arc-g-${si})`"
                      stroke-width="3.5"
                      stroke-linecap="round"
                      :stroke-dasharray="`${(Math.max(0, Math.min(100, stat.pct)) / 100 * 81.68).toFixed(2)} 81.68`"
                      transform="rotate(-90 17 17)"
                    />
                  </svg>
                </template>
                <div class="city-exp__economy-mini-copy">
                  <span class="city-exp__economy-mini-label">{{ stat.label }}</span>
                  <span class="city-exp__economy-mini-value">{{ stat.value }}</span>
                </div>
              </div>
            </div>
            <div class="city-exp__economy-copy">
              <p v-if="unemployment || laborPartic" class="city-exp__economy-para">
                <template v-if="laborPartic"><span class="city-exp__accent">{{ laborPartic }}%</span> of working-age adults participate in the labor force</template><template v-if="unemployment">, with an unemployment rate of <span class="city-exp__accent">{{ unemployment }}%</span></template>.
              </p>
              <p v-if="ownerShare || renterShare" class="city-exp__economy-para">
                <template v-if="ownerShare"><span class="city-exp__accent">{{ ownerShare }}%</span> of households own their home</template><template v-if="renterShare"> while <span class="city-exp__accent">{{ renterShare }}%</span> rent</template>.
              </p>
            </div>
            <div v-if="airport" ref="airportCardRef" class="city-exp__airport">
              <div class="city-exp__airport-row">
                <span class="mdi mdi-airplane city-exp__airport-icon"></span>
                <div class="city-exp__airport-info">
                  <span class="city-exp__airport-code">{{ airport.code }}</span>
                  <span class="city-exp__airport-name">{{ airport.name }}</span>
                </div>
              </div>
              <div v-if="qol.airportBusyness?.value?.hubAirlines?.length" class="city-exp__airline-tags">
                <span
                  v-for="(airline, idx) in qol.airportBusyness.value.hubAirlines"
                  :key="airline"
                  class="city-exp__airline-tag"
                  :style="airlineStyle(airline)"
                  @mouseenter="e => showTooltip(e, airline, idx)"
                  @mouseleave="hideTooltip"
                >{{ airline.trim() }}</span>
              </div>
              <Teleport to="body">
                <div v-if="tooltipState" class="city-exp__airline-tooltip" :style="tooltipFixedStyle">
                  {{ tooltipState.text }}
                </div>
              </Teleport>
              <div v-if="qol.airportBusyness?.value" class="city-exp__busy">
                <div class="city-exp__busy-header">
                  <span class="city-exp__busy-label">Traffic</span>
                  <span class="city-exp__busy-tag">{{ qol.airportBusyness.value.hubLabel }}</span>
                </div>
                <div class="city-exp__busy-track">
                  <div
                    v-for="i in 5" :key="i"
                    class="city-exp__busy-pip"
                    :class="{ 'city-exp__busy-pip--active': i <= qol.airportBusyness.value.busyScale }"
                  ></div>
                </div>
                <span class="city-exp__busy-sub">{{ (qol.airportBusyness.value.annualEnplanements / 1_000_000).toFixed(1) }}M passengers/yr · busier than {{ qol.airportBusyness.value.nationalPercentile }}% of tracked airports</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </template>
  </div>
</template>

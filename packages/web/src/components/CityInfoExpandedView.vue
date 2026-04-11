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

function ridershipTooltip(annualRidership: number): string {
  if (annualRidership < 3_000_000) return "Small transit system";
  if (annualRidership < 28_000_000) return "Midsize transit system";
  if (annualRidership < 70_000_000) return "Major transit system";
  return "Very large transit system";
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

function showTooltipText(e: MouseEvent | FocusEvent, text: string, color = '#555555') {
  const tagRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  tooltipState.value = {
    text,
    x: tagRect.left + tagRect.width / 2,
    y: tagRect.bottom + 10,
    color,
  };
}

function showTooltip(e: MouseEvent, airline: string) {
  const code = airport.value?.code ?? '';
  const solidColor = (AIRLINE_COLORS[airline]?.bg ?? '#66666666').slice(0, 7);
  showTooltipText(e, airlineTooltip(code, airline), solidColor);
}

function showRidershipTooltip(e: MouseEvent | FocusEvent, annualRidership: number) {
  showTooltipText(e, ridershipTooltip(annualRidership), '#5d6472');
}

function hideTooltip() {
  tooltipState.value = null;
}

// ── Transit authority ─────────────────────────────────────────────────────────
const transitData = computed(() => qol.value?.transitInfo?.value ?? null);

const MODE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'bus':           { bg: '#16a34a22', text: '#16a34a', label: 'Bus' },
  'subway':        { bg: '#2563eb22', text: '#2563eb', label: 'Subway' },
  'light-rail':    { bg: '#0891b222', text: '#0891b2', label: 'Light Rail' },
  'commuter-rail': { bg: '#71717a22', text: '#71717a', label: 'Commuter Rail' },
  'ferry':         { bg: '#06b6d422', text: '#06b6d4', label: 'Ferry' },
  'streetcar':     { bg: '#d9770622', text: '#d97706', label: 'Streetcar' },
  'cable-car':     { bg: '#dc262622', text: '#dc2626', label: 'Cable Car' },
};

function modeStyle(mode: string) {
  const c = MODE_COLORS[mode];
  if (!c) return {};
  return { backgroundColor: c.bg, color: c.text };
}

function modeLabel(mode: string) {
  return MODE_COLORS[mode]?.label ?? mode;
}

function formatDailyRidership(annualRidership: number): string {
  const dailyRidership = Math.round(annualRidership / 365);
  if (dailyRidership >= 1_000_000) return `${(dailyRidership / 1_000_000).toFixed(1)}M`;
  if (dailyRidership >= 1_000) return `${(dailyRidership / 1_000).toFixed(0)}K`;
  return dailyRidership.toLocaleString();
}

// ── Dominant commute mode ─────────────────────────────────────────────────────
const topCommuteMode = computed(() => {
  const modes = profile.value?.commuteModes;
  if (!modes?.length) return null;
  return modes.reduce((a: any, b: any) => a.share > b.share ? a : b);
});

const commuteNarrative = computed(() => {
  const top = topCommuteMode.value;
  const remote = remoteShare.value;
  if (!top) return null;
  const pct = Math.round(top.share * 100);
  let s = `${pct}% of residents ${top.label === 'Drove alone' ? 'drive alone' : top.label === 'Public transit' ? 'utilize public transit' : top.label.toLowerCase()}`;
  if (remote && remote >= 15 && top.label !== 'Worked from home') {
    s += `, and ${remote}% work entirely from home`;
  }
  if (commuteMin.value) s += `. The average commute is ${commuteMin.value} minutes`;
  return s + '.';
});

// ── Education narrative ───────────────────────────────────────────────────────
const educationNarrative = computed(() => {
  const p = profile.value;
  if (!p) return null;
  const bachelors = p.educationalAttainment?.find((e: any) => e.label === "Bachelor's degree");
  const graduate  = p.educationalAttainment?.find((e: any) => e.label === "Graduate degree");
  const bPct = bachelors ? Math.round(bachelors.share * 100) : null;
  const gPct = graduate  ? Math.round(graduate.share * 100)  : null;
  const headline = eduHeadline.value;
  if (!headline) return null;
  let s = `${headline.charAt(0).toUpperCase() + headline.slice(1)}`;
  if (gPct && gPct >= 15) s += `, including ${gPct}% with a graduate degree`;
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

const ageNarrative = computed(() => {
  const d = dominantAge.value;
  const age = medianAge.value;
  if (!d || !age) return null;
  return `The largest age group is ${d.label} at ${d.pct}% of residents.`;
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
        <div class="city-exp__column">
          <section v-for="i in 2" :key="`left-${i}`" class="data-card housing-exp__panel housing-exp__panel--compact">
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
        <div class="city-exp__column">
          <section v-for="i in 2" :key="`right-${i}`" class="data-card housing-exp__panel housing-exp__panel--compact">
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
      </div>
    </template>

    <!-- Error -->
    <div v-else-if="error" class="housing-exp__state"><p class="muted">{{ error }}</p></div>

    <!-- Data -->
    <template v-else-if="profile">

      <!-- Portrait -->
      <div class="city-exp__portrait data-card">
        <p class="city-exp__lead">
          <span class="city-exp__city-name">{{ props.city.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }}</span>
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

      <!-- Grid -->
      <div class="city-exp__grid">
        <div class="city-exp__column">
          <!-- Age -->
          <section v-if="ageSegments.length" class="data-card housing-exp__panel housing-exp__panel--compact">
            <div class="housing-exp__panel-head">
              <span class="data-card__icon mdi mdi-account-group-outline"></span>
              <span class="housing-exp__panel-title">Who Lives Here</span>
            </div>
            <p v-if="ageNarrative" class="city-exp__panel-narrative">
              <template v-if="medianAge">Median age is <span class="city-exp__accent">{{ medianAge }}</span>. </template>{{ ageNarrative }}
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

          <!-- Education -->
          <section v-if="educationBars.length" class="data-card housing-exp__panel housing-exp__panel--compact">
            <div class="housing-exp__panel-head">
              <span class="data-card__icon mdi mdi-school-outline"></span>
              <span class="housing-exp__panel-title">Education</span>
            </div>
            <p v-if="educationNarrative" class="city-exp__panel-narrative">{{ educationNarrative }}</p>
            <div class="bar-list" style="margin-top: 14px;">
              <div v-for="bar in educationBars" :key="bar.label" class="bar-list__row">
                <span class="bar-list__label">{{ bar.label }}</span>
                <div class="bar-list__track"><div class="bar-list__fill" :style="{width:bar.pct+'%'}"></div></div>
                <span class="bar-list__value">{{ bar.value }}</span>
              </div>
            </div>
          </section>
        </div>

        <div class="city-exp__column">
          <!-- Getting around -->
          <section v-if="commuteBars.length" class="data-card housing-exp__panel housing-exp__panel--compact">
            <div class="housing-exp__panel-head">
              <span class="data-card__icon mdi mdi-car-outline"></span>
              <span class="housing-exp__panel-title">Getting Around</span>
            </div>
            <p v-if="commuteNarrative" class="city-exp__panel-narrative">{{ commuteNarrative }}</p>
            <div class="bar-list bar-list--wide" style="margin-top: 14px;">
              <div v-for="bar in commuteBars" :key="bar.label" class="bar-list__row">
                <span class="bar-list__label">{{ bar.label }}</span>
                <div class="bar-list__track"><div class="bar-list__fill" :style="{width:bar.pct+'%'}"></div></div>
                <span class="bar-list__value">{{ bar.value }}</span>
              </div>
            </div>
            <div v-if="transitData" class="city-exp__transit">
              <div class="city-exp__transit-header">Transit Authority</div>
              <div class="city-exp__transit-agencies">
                <div v-for="agency in transitData.agencies" :key="agency.shortName" class="city-exp__transit-agency">
                  <span class="city-exp__transit-name">{{ agency.shortName }}</span>
                  <div class="city-exp__transit-modes">
                    <span v-for="mode in agency.modes" :key="mode" class="city-exp__transit-mode" :style="modeStyle(mode)">
                      {{ modeLabel(mode) }}
                    </span>
                  </div>
                  <span
                    class="city-exp__transit-ridership"
                    tabindex="0"
                    @mouseenter="e => showRidershipTooltip(e, agency.annualRidership)"
                    @mouseleave="hideTooltip"
                    @focus="e => showRidershipTooltip(e, agency.annualRidership)"
                    @blur="hideTooltip"
                  >{{ formatDailyRidership(agency.annualRidership) }} daily trips</span>
                </div>
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
              <p v-if="unemployment || laborPartic" class="city-exp__economy-para">
                <template v-if="laborPartic"><span class="city-exp__accent">{{ laborPartic }}%</span> of working-age adults participate in the labor force</template><template v-if="unemployment">, with an unemployment rate of <span class="city-exp__accent">{{ unemployment }}%</span></template>.
              </p>
              <p v-if="ownerShare || renterShare" class="city-exp__economy-para">
                <template v-if="ownerShare"><span class="city-exp__accent">{{ ownerShare }}%</span> of households own their home</template><template v-if="renterShare"> while <span class="city-exp__accent">{{ renterShare }}%</span> rent</template>.
              </p>
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
                    v-for="airline in qol.airportBusyness.value.hubAirlines"
                    :key="airline"
                    class="city-exp__airline-tag"
                    :style="airlineStyle(airline)"
                    @mouseenter="e => showTooltip(e, airline)"
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
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { fetchCityLocation, fetchMajorCitiesInState } from '../api/cityLocation';

const props = defineProps<{ city: string; state: string; cityName: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const STATE_FIPS: Record<string, string> = {
  al: '01', ak: '02', az: '04', ar: '05', ca: '06', co: '08', ct: '09', de: '10',
  dc: '11', fl: '12', ga: '13', hi: '15', id: '16', il: '17', in: '18', ia: '19',
  ks: '20', ky: '21', la: '22', me: '23', md: '24', ma: '25', mi: '26', mn: '27',
  ms: '28', mo: '29', mt: '30', ne: '31', nv: '32', nh: '33', nj: '34', nm: '35',
  ny: '36', nc: '37', nd: '38', oh: '39', ok: '40', or: '41', pa: '42', ri: '44',
  sc: '45', sd: '46', tn: '47', tx: '48', ut: '49', vt: '50', va: '51', wa: '53',
  wv: '54', wi: '55', wy: '56',
};

const WIDTH = 520;
const HEIGHT = 420;
const PADDING = 28;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

const MIN_SCALE = 1;
const MAX_SCALE = 6;

// Minimum on-screen separation (viewBox units) a "quiet" context dot must keep from the main
// pin and from every other context dot already placed. Zooming in shrinks how much *world*
// distance a fixed on-screen gap covers, so dividing this by the current scale is what lets
// more cities reveal themselves as you zoom in on a crowded metro area.
const BASE_MIN_SEPARATION = 26;

type Dot = { x: number; y: number; name: string };

const loading = ref(true);
const notFound = ref(false);
const outlinePath = ref<string | null>(null);
const pin = ref<{ x: number; y: number } | null>(null);
const rawDots = ref<Dot[]>([]);
const hoveredDot = ref<number | null>(null);

const scale = ref(1);
const panX = ref(0);
const panY = ref(0);
const dragging = ref(false);
let dragStart = { x: 0, y: 0, panX: 0, panY: 0 };

const stageEl = ref<HTMLDivElement | null>(null);
const mainLabelEl = ref<HTMLDivElement | null>(null);
const contextLabelEl = ref<HTMLDivElement | null>(null);
const contextLabelOffset = ref({ x: 0, y: 0 });

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Screen (viewBox-unit) position of a world point at the current zoom/pan.
function toScreen(x: number, y: number) {
  return {
    x: CENTER_X + (x - CENTER_X) * scale.value + panX.value,
    y: CENTER_Y + (y - CENTER_Y) * scale.value + panY.value,
  };
}

// World point currently sitting under a given screen (viewBox-unit) position — the inverse of toScreen.
function toWorld(x: number, y: number) {
  return {
    x: CENTER_X + (x - CENTER_X - panX.value) / scale.value,
    y: CENTER_Y + (y - CENTER_Y - panY.value) / scale.value,
  };
}

function clampPan() {
  const maxPanX = Math.max(0, (scale.value - 1) * WIDTH * 0.6);
  const maxPanY = Math.max(0, (scale.value - 1) * HEIGHT * 0.6);
  panX.value = Math.min(maxPanX, Math.max(-maxPanX, panX.value));
  panY.value = Math.min(maxPanY, Math.max(-maxPanY, panY.value));
}

// Zooms so that the world point currently under (screenX, screenY) stays under it afterward.
function zoomAt(screenX: number, screenY: number, factor: number) {
  const world = toWorld(screenX, screenY);
  const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale.value * factor));
  panX.value = screenX - CENTER_X - (world.x - CENTER_X) * nextScale;
  panY.value = screenY - CENTER_Y - (world.y - CENTER_Y) * nextScale;
  scale.value = nextScale;
  clampPan();
}

function zoomButton(factor: number) {
  zoomAt(CENTER_X, CENTER_Y, factor);
}

function resetZoom() {
  scale.value = 1;
  panX.value = 0;
  panY.value = 0;
}

function stagePoint(e: MouseEvent): { x: number; y: number } | null {
  if (!stageEl.value) return null;
  const rect = stageEl.value.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * WIDTH,
    y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
  };
}

function onWheel(e: WheelEvent) {
  const point = stagePoint(e);
  if (!point) return;
  e.preventDefault();
  const factor = Math.exp(-e.deltaY * 0.0015);
  zoomAt(point.x, point.y, factor);
}

function onPointerDown(e: MouseEvent) {
  if (scale.value <= 1) return;
  dragging.value = true;
  dragStart = { x: e.clientX, y: e.clientY, panX: panX.value, panY: panY.value };
}

function onPointerMove(e: MouseEvent) {
  if (!dragging.value || !stageEl.value) return;
  const rect = stageEl.value.getBoundingClientRect();
  panX.value = dragStart.panX + ((e.clientX - dragStart.x) / rect.width) * WIDTH;
  panY.value = dragStart.panY + ((e.clientY - dragStart.y) / rect.height) * HEIGHT;
  clampPan();
}

function onPointerUp() {
  dragging.value = false;
}

// Greedily keep the biggest cities and skip any that would land too close (on-screen, at the
// current zoom) to the main pin OR to another context dot already placed — recomputed
// reactively as `scale` changes. This is what keeps a big metro's suburbs (or a city that's
// simply near the one you're viewing, like San Francisco next to Oakland) from cluttering the
// default view — zoom in and the same city reveals itself once there's screen room for it.
const visibleDots = computed(() => {
  const threshold = BASE_MIN_SEPARATION / scale.value;
  const pinScreen = pin.value ? toScreen(pin.value.x, pin.value.y) : null;
  const kept: (Dot & { screen: { x: number; y: number } })[] = [];

  for (const dot of rawDots.value) {
    const screen = toScreen(dot.x, dot.y);
    const tooClose =
      (pinScreen && distance(screen, pinScreen) < threshold) ||
      kept.some((k) => distance(screen, k.screen) < threshold);
    if (tooClose) continue;
    kept.push({ ...dot, screen });
  }
  return kept;
});

const hoveredDotData = computed(() => (hoveredDot.value !== null ? visibleDots.value[hoveredDot.value] ?? null : null));

// The main city's own label only needs to step aside once a context dot has actually revealed
// itself close enough to crowd it — a fixed screen-pixel distance (not scaled by zoom), so it
// naturally comes back once you've zoomed in far enough to give both labels their own space.
const LABEL_CLEARANCE_PX = 70;
const mainLabelHidden = computed(() => {
  if (!pin.value) return false;
  const pinScreen = toScreen(pin.value.x, pin.value.y);
  return visibleDots.value.some((d) => distance(d.screen, pinScreen) < LABEL_CLEARANCE_PX);
});

// Nudges the hovered context label sideways when it would otherwise overlap the main city's
// label — measured against real rendered rects since pill width depends on how long each
// city's name is. Only matters while the main label is still showing.
async function resolveLabelCollision() {
  contextLabelOffset.value = { x: 0, y: 0 };
  if (!hoveredDotData.value || mainLabelHidden.value) return;

  await nextTick();
  const a = mainLabelEl.value?.getBoundingClientRect();
  const b = contextLabelEl.value?.getBoundingClientRect();
  if (!a || !b) return;

  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (overlapX <= 0 || overlapY <= 0) return;

  const bCenterX = (b.left + b.right) / 2;
  const aCenterX = (a.left + a.right) / 2;
  const pushRight = bCenterX >= aCenterX;
  contextLabelOffset.value = { x: (overlapX / 2 + 8) * (pushRight ? 1 : -1), y: 0 };
}

watch(hoveredDot, resolveLabelCollision);

async function load() {
  loading.value = true;
  notFound.value = false;
  outlinePath.value = null;
  pin.value = null;
  rawDots.value = [];
  resetZoom();

  const fips = STATE_FIPS[props.state.toLowerCase()];
  if (!fips) {
    loading.value = false;
    notFound.value = true;
    return;
  }

  const [location, topoModule, topojson, d3geo] = await Promise.all([
    fetchCityLocation(props.state, props.city),
    import('us-atlas/states-10m.json'),
    import('topojson-client'),
    import('d3-geo'),
  ]);

  loading.value = false;

  if (!location) {
    notFound.value = true;
    return;
  }

  const topology = (topoModule as any).default ?? topoModule;
  const geometry = topology.objects.states.geometries.find((g: any) => g.id === fips);
  if (!geometry) {
    notFound.value = true;
    return;
  }

  const feature = topojson.feature(topology, geometry) as any;
  const projection = d3geo.geoMercator().fitExtent(
    [[PADDING, PADDING], [WIDTH - PADDING, HEIGHT - PADDING]],
    feature
  );
  const pathGenerator = d3geo.geoPath(projection);
  outlinePath.value = pathGenerator(feature);

  const projected = projection([location.lng, location.lat]);
  if (projected) pin.value = { x: projected[0], y: projected[1] };

  // Fetched separately (not awaited above) so the outline + main pin can render immediately —
  // this can take a few seconds on a cold cache since it's geocoding several cities.
  fetchMajorCitiesInState(props.state, props.city).then((majorCities) => {
    const dots: Dot[] = [];
    for (const major of majorCities) {
      const point = projection([major.lng, major.lat]);
      if (!point) continue;
      dots.push({ x: point[0], y: point[1], name: major.name });
    }
    rawDots.value = dots;
  });
}

function lockBodyScroll(locked: boolean) {
  document.body.style.overflow = locked ? 'hidden' : '';
}

onMounted(() => {
  load();
  lockBodyScroll(true);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
});

onBeforeUnmount(() => {
  lockBodyScroll(false);
  window.removeEventListener('mousemove', onPointerMove);
  window.removeEventListener('mouseup', onPointerUp);
});

watch(() => [props.city, props.state], load);
</script>

<template>
  <Teleport to="body">
    <div class="city-loc-modal__backdrop" @click.self="emit('close')">
      <div class="city-loc-modal__panel">
        <div class="city-loc-modal__header">
          <span class="city-loc-modal__title">
            <span class="city-loc-modal__title-dot" aria-hidden="true"></span>
            {{ cityName }}, {{ state.toUpperCase() }}
          </span>
          <button class="city-loc-modal__close" aria-label="Close" @click="emit('close')">
            <span class="mdi mdi-close"></span>
          </button>
        </div>

        <div v-if="loading" class="city-loc-modal__state">Locating {{ cityName }}&hellip;</div>
        <p v-else-if="notFound" class="city-loc-modal__state">Couldn't find a location for {{ cityName }}.</p>

        <div
          v-else
          ref="stageEl"
          class="city-loc-modal__stage"
          :class="{ 'city-loc-modal__stage--draggable': scale > 1 }"
          @wheel="onWheel"
          @mousedown="onPointerDown"
          @dblclick="resetZoom"
        >
          <svg
            class="city-loc-modal__svg"
            :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <g :transform="`translate(${panX + CENTER_X * (1 - scale)}, ${panY + CENTER_Y * (1 - scale)}) scale(${scale})`">
              <path class="city-loc-modal__outline" :d="outlinePath ?? ''" vector-effect="non-scaling-stroke" />
              <g v-for="(dot, i) in visibleDots" :key="dot.name">
                <!-- oversized, invisible hit target — the visible dot below is too small to hover reliably -->
                <circle
                  class="city-loc-modal__context-hit"
                  :cx="dot.x"
                  :cy="dot.y"
                  :r="12 / scale"
                  @mouseenter="hoveredDot = i"
                  @mouseleave="hoveredDot = null"
                />
                <circle
                  class="city-loc-modal__context-dot"
                  :class="{ 'city-loc-modal__context-dot--hover': hoveredDot === i }"
                  :cx="dot.x"
                  :cy="dot.y"
                  :r="3 / scale"
                />
              </g>
              <g v-if="pin" :transform="`translate(${pin.x}, ${pin.y})`">
                <circle class="city-loc-modal__pulse" :r="5 / scale" vector-effect="non-scaling-stroke" />
                <circle class="city-loc-modal__dot" :r="5 / scale" vector-effect="non-scaling-stroke" />
              </g>
            </g>
          </svg>

          <div
            v-if="hoveredDotData"
            ref="contextLabelEl"
            class="city-loc-modal__label city-loc-modal__label--context"
            :style="{
              left: `${(hoveredDotData.screen.x / WIDTH) * 100}%`,
              top: `${(hoveredDotData.screen.y / HEIGHT) * 100}%`,
              '--dodge-x': `${contextLabelOffset.x}px`,
              '--dodge-y': `${contextLabelOffset.y}px`,
            }"
          >
            {{ hoveredDotData.name }}
          </div>

          <div
            v-if="pin"
            ref="mainLabelEl"
            class="city-loc-modal__label"
            :class="{ 'city-loc-modal__label--hidden': mainLabelHidden }"
            :style="{
              left: `${(toScreen(pin.x, pin.y).x / WIDTH) * 100}%`,
              top: `${(toScreen(pin.x, pin.y).y / HEIGHT) * 100}%`,
            }"
          >
            {{ cityName }}
          </div>

          <div class="city-loc-modal__zoom-controls">
            <button class="city-loc-modal__zoom-btn" aria-label="Zoom in" @click="zoomButton(1.6)">
              <span class="mdi mdi-plus"></span>
            </button>
            <button class="city-loc-modal__zoom-btn" aria-label="Zoom out" @click="zoomButton(1 / 1.6)">
              <span class="mdi mdi-minus"></span>
            </button>
            <button
              v-if="scale > 1"
              class="city-loc-modal__zoom-btn"
              aria-label="Reset zoom"
              @click="resetZoom"
            >
              <span class="mdi mdi-crosshairs-gps"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.city-loc-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.city-loc-modal__panel {
  width: 100%;
  max-width: 560px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 16px;
  box-shadow: var(--card-shadow-md);
  padding: 20px;
}

.city-loc-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.city-loc-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.city-loc-modal__title-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
  flex-shrink: 0;
}

.city-loc-modal__close {
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
  border-radius: 8px;
  transition: background 0.15s ease, color 0.15s ease;
}

.city-loc-modal__close:hover {
  background: var(--bg-card-inner);
  color: var(--text-primary);
}

.city-loc-modal__state {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.city-loc-modal__stage {
  position: relative;
  width: 100%;
  aspect-ratio: 520 / 420;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-card-subtle);
  touch-action: none;
  user-select: none;
}

.city-loc-modal__stage--draggable {
  cursor: grab;
}

.city-loc-modal__stage--draggable:active {
  cursor: grabbing;
}

.city-loc-modal__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.city-loc-modal__outline {
  fill: var(--bg-card-inner);
  stroke: var(--border-color);
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.city-loc-modal__pulse {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  opacity: 0.6;
  animation: city-loc-pulse 2.2s ease-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}

.city-loc-modal__dot {
  fill: var(--accent);
  stroke: var(--bg-card-inner);
  stroke-width: 2;
}

.city-loc-modal__context-hit {
  fill: transparent;
  cursor: pointer;
}

.city-loc-modal__context-dot {
  fill: var(--text-muted);
  opacity: 0.55;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.city-loc-modal__context-dot--hover {
  opacity: 0.9;
}

@keyframes city-loc-pulse {
  0% { r: 5; opacity: 0.6; }
  100% { r: 18; opacity: 0; }
}

.city-loc-modal__label {
  position: absolute;
  transform: translate(-50%, calc(-100% - 14px));
  transform-origin: center bottom;
  background: var(--bg-card-inner);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 4px 10px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-primary);
  box-shadow: var(--card-shadow);
  white-space: nowrap;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.city-loc-modal__label--hidden {
  opacity: 0;
}

.city-loc-modal__label--context {
  background: var(--bg-card-subtle);
  font-size: 0.62rem;
  padding: 3px 8px;
  /* --dodge-x/--dodge-y let script-computed collision avoidance nudge the pill aside without
     touching the anchor point (dot position) that left/top already target. */
  transform: translate(calc(-50% + var(--dodge-x, 0px)), calc(-100% - 10px + var(--dodge-y, 0px)));
  opacity: 0.9;
  transition: transform 0.12s ease;
}

.city-loc-modal__label.city-loc-modal__label--context::after {
  background: var(--bg-card-subtle);
  /* Keep the tail pointing at the actual dot even though the pill body dodged sideways. */
  left: calc(50% - var(--dodge-x, 0px));
}

.city-loc-modal__label::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 8px;
  height: 8px;
  background: var(--bg-card-inner);
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  transform: translateX(-50%) rotate(45deg);
}

.city-loc-modal__zoom-controls {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.city-loc-modal__zoom-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--bg-card-inner);
  color: var(--text-primary);
  border-radius: 7px;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: var(--card-shadow);
  transition: background 0.15s ease;
}

.city-loc-modal__zoom-btn:hover {
  background: var(--bg-card-subtle);
}
</style>

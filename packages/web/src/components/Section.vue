<script setup lang="ts">
import { ref, computed, withDefaults } from "vue";
import { mdiChevronDown, mdiChevronRight } from "@mdi/js";

const props = withDefaults(defineProps<{
  title: string;
  modelValue?: boolean;
  toggle?: boolean;
  defaultOpen?: boolean;
}>(), {
  toggle: true,
  defaultOpen: false,
});

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

const isControlled = computed(() => props.modelValue !== undefined);

const toggleEnabled = computed(() => Boolean(props.toggle));

const internalOpen = ref<boolean>(props.defaultOpen ?? false);

const open = computed({
  get() {
    if (!toggleEnabled.value) return true;
    return isControlled.value ? (props.modelValue as boolean) : internalOpen.value;
  },
  set(value: boolean) {
    if (!toggleEnabled.value) return;
    if (isControlled.value) {
      emit("update:modelValue", value);
    } else {
      internalOpen.value = value;
    }
  },
});

function toggleOpen() {
  if (!toggleEnabled.value) return;
  open.value = !open.value;
}

</script>

<template>
  <div class="section">
    <button
        class="section-header"
        @click="toggleOpen"
        :aria-expanded="open"
        :aria-disabled="!toggleEnabled"
        tabindex="0"
    >
      {{ title }}
      <svg v-if="toggleEnabled" width="24" height="24" viewBox="0 0 24 24">
        <path :d="open ? mdiChevronDown : mdiChevronRight" fill="currentColor"/>
      </svg>
    </button>

    <div v-if="open" class="section-content">
      <slot />
    </div>
  </div>
</template>

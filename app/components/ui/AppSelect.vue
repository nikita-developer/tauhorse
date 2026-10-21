<template>
  <div
    ref="root"
    class="app-select"
    :class="{'is-open': isOpen, 'is-up': opensUp, 'is-disabled': disabled, 'is-placeholder': !selectedOption}"
  >
    <button
      :id="id"
      ref="trigger"
      type="button"
      class="app-select__trigger"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :aria-controls="listboxId"
      :aria-label="ariaLabel || undefined"
      :disabled="disabled"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span class="app-select__value">{{ selectedOption?.label || placeholder }}</span>
      <svg class="app-select__chevron" viewBox="0 0 16 16" aria-hidden="true">
        <path d="m4 6 4 4 4-4" />
      </svg>
    </button>

    <Transition name="app-select-pop">
      <div
        v-if="isOpen"
        :id="listboxId"
        ref="menu"
        class="app-select__menu"
        role="listbox"
        :aria-labelledby="id || undefined"
        @keydown="onMenuKeydown"
      >
        <button
          v-for="(option, index) in normalizedOptions"
          :key="`${String(option.value)}-${index}`"
          :ref="el => setOptionRef(el, index)"
          type="button"
          class="app-select__option"
          :class="{'is-selected': isSame(option.value, modelValue)}"
          role="option"
          :aria-selected="isSame(option.value, modelValue) ? 'true' : 'false'"
          :disabled="option.disabled"
          @click="selectOption(option)"
          @mouseenter="focusedIndex = index"
        >
          <span>{{ option.label }}</span>
          <svg v-if="isSame(option.value, modelValue)" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.2 8.2 2.7 2.7 6-6" /></svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch} from 'vue'

const props = defineProps({
  modelValue: {default: ''},
  options: {type: Array, default: () => []},
  placeholder: {type: String, default: 'Выберите значение'},
  disabled: {type: Boolean, default: false},
  id: {type: String, default: ''},
  ariaLabel: {type: String, default: ''}
})

const emit = defineEmits(['update:modelValue', 'change'])
const root = ref(null)
const trigger = ref(null)
const menu = ref(null)
const isOpen = ref(false)
const focusedIndex = ref(-1)
const optionRefs = ref([])
const opensUp = ref(false)
const uid = useId()
const listboxId = computed(() => `${props.id || `app-select-${uid}`}-listbox`)

const normalizedOptions = computed(() => props.options.map(option => {
  if (option && typeof option === 'object' && !Array.isArray(option)) {
    return {
      value: option.value,
      label: String(option.label ?? option.value ?? ''),
      disabled: Boolean(option.disabled)
    }
  }
  return {value: option, label: String(option ?? ''), disabled: false}
}))

const isSame = (left, right) => {
  if (left === right) return true
  if (left == null || right == null) return false
  return String(left) === String(right)
}

const selectedOption = computed(() => normalizedOptions.value.find(option => isSame(option.value, props.modelValue)) || null)

const setOptionRef = (element, index) => {
  if (element) optionRefs.value[index] = element
}

const firstEnabledIndex = () => normalizedOptions.value.findIndex(option => !option.disabled)
const lastEnabledIndex = () => {
  for (let index = normalizedOptions.value.length - 1; index >= 0; index -= 1) {
    if (!normalizedOptions.value[index]?.disabled) return index
  }
  return -1
}

const moveFocus = direction => {
  if (!normalizedOptions.value.length) return
  let next = focusedIndex.value
  for (let attempt = 0; attempt < normalizedOptions.value.length; attempt += 1) {
    next = (next + direction + normalizedOptions.value.length) % normalizedOptions.value.length
    if (!normalizedOptions.value[next]?.disabled) {
      focusedIndex.value = next
      nextTick(() => optionRefs.value[next]?.focus())
      return
    }
  }
}

const updatePlacement = () => {
  if (!import.meta.client || !root.value) return
  const rect = root.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  opensUp.value = spaceBelow < 260 && spaceAbove > spaceBelow
}

const open = async preferredDirection => {
  if (props.disabled || isOpen.value) return
  optionRefs.value = []
  updatePlacement()
  isOpen.value = true
  const selectedIndex = normalizedOptions.value.findIndex(option => isSame(option.value, props.modelValue) && !option.disabled)
  focusedIndex.value = selectedIndex >= 0
    ? selectedIndex
    : (preferredDirection === -1 ? lastEnabledIndex() : firstEnabledIndex())
  await nextTick()
  if (focusedIndex.value >= 0) optionRefs.value[focusedIndex.value]?.focus()
}

const close = ({restoreFocus = false} = {}) => {
  if (!isOpen.value) return
  isOpen.value = false
  if (restoreFocus) nextTick(() => trigger.value?.focus())
}

const toggle = () => {
  if (isOpen.value) close()
  else open(1)
}

const selectOption = option => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close({restoreFocus: true})
}

const onTriggerKeydown = event => {
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault()
    open(event.key === 'ArrowUp' ? -1 : 1)
  }
}

const onMenuKeydown = event => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveFocus(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveFocus(-1)
  } else if (event.key === 'Home') {
    event.preventDefault()
    focusedIndex.value = firstEnabledIndex()
    nextTick(() => optionRefs.value[focusedIndex.value]?.focus())
  } else if (event.key === 'End') {
    event.preventDefault()
    focusedIndex.value = lastEnabledIndex()
    nextTick(() => optionRefs.value[focusedIndex.value]?.focus())
  } else if (event.key === 'Escape') {
    event.preventDefault()
    close({restoreFocus: true})
  } else if (event.key === 'Tab') {
    close()
  }
}

const onPointerDown = event => {
  if (isOpen.value && root.value && !root.value.contains(event.target)) close()
}
const onViewportChange = () => { if (isOpen.value) updatePlacement() }

watch(() => props.modelValue, () => {
  if (!isOpen.value) return
  const selectedIndex = normalizedOptions.value.findIndex(option => isSame(option.value, props.modelValue) && !option.disabled)
  if (selectedIndex >= 0) focusedIndex.value = selectedIndex
})
watch(() => props.disabled, value => { if (value) close() })

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('resize', onViewportChange, {passive: true})
  window.addEventListener('scroll', onViewportChange, {passive: true, capture: true})
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<style scoped lang="scss">
.app-select {
  position: relative;
  width: 100%;
  min-width: 0;
  color: #2f2418;
  font-size: 13px;
}

.app-select__trigger {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 46px;
  padding: 0 13px;
  border: 1px solid rgba(122, 92, 55, .15);
  border-radius: 13px;
  background: rgba(255, 255, 255, .94);
  color: inherit;
  font: inherit;
  text-align: left;
  outline: none;
  cursor: pointer;
  transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease;
}

.app-select__trigger:hover:not(:disabled) { border-color: rgba(111, 82, 48, .28); background: #fff; }
.app-select__trigger:focus-visible,
.app-select.is-open .app-select__trigger { border-color: rgba(111, 82, 48, .4); background: #fff; box-shadow: 0 0 0 4px rgba(111, 82, 48, .08); }
.app-select__trigger:disabled { opacity: .55; cursor: not-allowed; }
.app-select__value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-select.is-placeholder .app-select__value { color: #8e8479; }

.app-select__chevron {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: #7a6246;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform .18s ease;
}
.app-select.is-open .app-select__chevron { transform: rotate(180deg); }

.app-select__menu {
  position: absolute;
  z-index: 80;
  top: calc(100% + 7px);
  left: 0;
  width: 100%;
  max-height: min(300px, 42vh);
  overflow: auto;
  padding: 6px;
  border: 1px solid rgba(111, 82, 48, .14);
  border-radius: 14px;
  background: rgba(255, 253, 249, .99);
  box-shadow: 0 18px 44px rgba(58, 39, 19, .16);
  backdrop-filter: blur(12px);
  overscroll-behavior: contain;
}
.app-select.is-up .app-select__menu { top: auto; bottom: calc(100% + 7px); }

.app-select__option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #4a3927;
  font: inherit;
  text-align: left;
  cursor: pointer;
  outline: none;
}
.app-select__option:hover:not(:disabled),
.app-select__option:focus-visible { background: #f2eadf; }
.app-select__option.is-selected { background: #ede3d6; color: #3b2b1c; font-weight: 750; }
.app-select__option:disabled { opacity: .45; cursor: not-allowed; }
.app-select__option svg { width: 17px; height: 17px; fill: none; stroke: #6f5230; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.app-select-pop-enter-active,
.app-select-pop-leave-active { transition: opacity .14s ease, transform .14s ease; transform-origin: top; }
.app-select-pop-enter-from,
.app-select-pop-leave-to { opacity: 0; transform: translateY(-4px) scale(.985); }

@media (max-width: 760px) {
  .app-select__trigger { min-height: 48px; font-size: 16px; }
  .app-select__menu { max-height: min(340px, 48vh); }
  .app-select__option { min-height: 46px; font-size: 15px; }
}

@media (prefers-reduced-motion: reduce) {
  .app-select__trigger,
  .app-select__chevron,
  .app-select-pop-enter-active,
  .app-select-pop-leave-active { transition: none; }
}
</style>

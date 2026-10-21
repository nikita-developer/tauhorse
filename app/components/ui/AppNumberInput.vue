<template>
  <div class="app-number" :class="{'is-disabled': disabled, 'is-compact': compact, 'has-suffix': Boolean(suffix)}">
    <button
      class="app-number__button app-number__button--minus"
      type="button"
      :disabled="disabled || !canDecrease"
      :aria-label="`Уменьшить${ariaLabel ? `: ${ariaLabel}` : ''}`"
      @click="stepBy(-1)"
    >−</button>

    <div class="app-number__field">
      <input
        :id="id || undefined"
        v-model="textValue"
        class="app-number__input"
        type="text"
        :inputmode="inputMode"
        autocomplete="off"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-label="ariaLabel || undefined"
        @input="onInput"
        @focus="isFocused = true"
        @blur="onBlur"
        @keydown.up.prevent="stepBy(1)"
        @keydown.down.prevent="stepBy(-1)"
      >
      <span v-if="suffix" class="app-number__suffix" aria-hidden="true">{{ suffix }}</span>
    </div>

    <button
      class="app-number__button app-number__button--plus"
      type="button"
      :disabled="disabled || !canIncrease"
      :aria-label="`Увеличить${ariaLabel ? `: ${ariaLabel}` : ''}`"
      @click="stepBy(1)"
    >+</button>
  </div>
</template>

<script setup>
import {computed, ref, watch} from 'vue'

const props = defineProps({
  modelValue: {default: ''},
  min: {type: [Number, String], default: undefined},
  max: {type: [Number, String], default: undefined},
  step: {type: [Number, String], default: 1},
  placeholder: {type: String, default: ''},
  disabled: {type: Boolean, default: false},
  required: {type: Boolean, default: false},
  compact: {type: Boolean, default: false},
  suffix: {type: String, default: ''},
  id: {type: String, default: ''},
  ariaLabel: {type: String, default: ''}
})

const emit = defineEmits(['update:modelValue', 'change', 'blur'])
const textValue = ref(props.modelValue === '' || props.modelValue == null ? '' : String(props.modelValue).replace('.', ','))
const isFocused = ref(false)

const stepNumber = computed(() => {
  const value = Number(props.step)
  return Number.isFinite(value) && value > 0 ? value : 1
})
const minNumber = computed(() => props.min === undefined || props.min === '' ? null : Number(props.min))
const maxNumber = computed(() => props.max === undefined || props.max === '' ? null : Number(props.max))
const numericValue = computed(() => parseValue(textValue.value))
const inputMode = computed(() => stepNumber.value % 1 === 0 ? 'numeric' : 'decimal')
const canDecrease = computed(() => minNumber.value == null || numericValue.value == null || numericValue.value > minNumber.value)
const canIncrease = computed(() => maxNumber.value == null || numericValue.value == null || numericValue.value < maxNumber.value)

function decimals(value) {
  const raw = String(value)
  return raw.includes('.') ? raw.split('.')[1].length : 0
}
function normalizePrecision(value) {
  return Number(Number(value).toFixed(Math.min(6, Math.max(decimals(stepNumber.value), 0))))
}
function alignToStep(value) {
  const step = stepNumber.value
  const base = minNumber.value != null && Number.isFinite(minNumber.value) ? minNumber.value : 0
  return normalizePrecision(base + Math.round((Number(value) - base) / step) * step)
}
function clamp(value) {
  let next = Number(value)
  if (!Number.isFinite(next)) return null
  if (minNumber.value != null && Number.isFinite(minNumber.value)) next = Math.max(minNumber.value, next)
  if (maxNumber.value != null && Number.isFinite(maxNumber.value)) next = Math.min(maxNumber.value, next)
  next = alignToStep(next)
  if (minNumber.value != null && Number.isFinite(minNumber.value)) next = Math.max(minNumber.value, next)
  if (maxNumber.value != null && Number.isFinite(maxNumber.value)) next = Math.min(maxNumber.value, next)
  return normalizePrecision(next)
}
function parseValue(value) {
  if (value === '' || value == null || value === '-' || value === ',' || value === '.') return null
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}
function formatForInput(value) {
  if (value === '' || value == null) return ''
  return String(value).replace('.', ',')
}
function sanitize(value) {
  let raw = String(value ?? '').replace(/\s/g, '').replace('.', ',')
  raw = raw.replace(/[^0-9,\-]/g, '')
  if (!raw.startsWith('-')) raw = raw.replace(/-/g, '')
  else raw = `-${raw.slice(1).replace(/-/g, '')}`
  const comma = raw.indexOf(',')
  if (comma !== -1) raw = raw.slice(0, comma + 1) + raw.slice(comma + 1).replace(/,/g, '')
  if (stepNumber.value % 1 === 0 && raw.includes(',')) raw = raw.split(',')[0]
  return raw
}
function publish({commit = false} = {}) {
  const parsed = parseValue(textValue.value)
  if (parsed == null) {
    emit('update:modelValue', '')
    if (commit) emit('change', '')
    return
  }
  const value = commit ? clamp(parsed) : parsed
  if (value == null) return
  if (commit) textValue.value = formatForInput(value)
  emit('update:modelValue', value)
  if (commit) emit('change', value)
}
function onInput(event) {
  const next = sanitize(event.target.value)
  textValue.value = next
  if (event.target.value !== next) event.target.value = next
  publish()
}
function onBlur() {
  isFocused.value = false
  publish({commit: true})
  emit('blur')
}
function stepBy(direction) {
  if (props.disabled) return
  let base = numericValue.value
  if (base == null) base = direction > 0 ? ((minNumber.value ?? 0) - stepNumber.value) : ((maxNumber.value ?? minNumber.value ?? 0) + stepNumber.value)
  const next = clamp(base + direction * stepNumber.value)
  if (next == null) return
  textValue.value = formatForInput(next)
  emit('update:modelValue', next)
  emit('change', next)
}

watch(() => props.modelValue, value => {
  if (isFocused.value) return
  textValue.value = formatForInput(value)
})
</script>

<style scoped lang="scss">
.app-number{display:grid;grid-template-columns:42px minmax(0,1fr) 42px;align-items:stretch;width:100%;min-width:0;min-height:46px;border:1px solid rgba(122,92,55,.15);border-radius:13px;background:#fff;box-shadow:0 0 0 0 rgba(111,82,48,0);overflow:hidden;transition:border-color .18s ease,box-shadow .18s ease,background-color .18s ease}
.app-number:focus-within{border-color:rgba(111,82,48,.4);box-shadow:0 0 0 4px rgba(111,82,48,.08)}
.app-number__button{display:grid;place-items:center;border:0;background:#f7f1e8;color:#6f5230;font-family:inherit;font-size:20px;font-weight:800;line-height:1;cursor:pointer;transition:background-color .16s ease,color .16s ease,opacity .16s ease}
.app-number__button:hover:not(:disabled){background:#eee3d5;color:#4b3824}.app-number__button:disabled{opacity:.34;cursor:not-allowed}
.app-number__button--minus{border-right:1px solid rgba(122,92,55,.1)}.app-number__button--plus{border-left:1px solid rgba(122,92,55,.1)}
.app-number__field{position:relative;display:flex;align-items:center;min-width:0;background:#fff}.app-number__input{width:100%;min-width:0;height:100%;min-height:44px;padding:0 12px;border:0;background:transparent;color:#342719;font:inherit;font-size:13px;outline:0;text-align:center}.app-number__input::placeholder{color:#9b9187}.app-number__suffix{position:absolute;right:10px;color:#8a7a69;font-size:11px;font-weight:750;pointer-events:none}.has-suffix .app-number__input{padding-right:44px}
.app-number.is-disabled{opacity:.58}.app-number.is-compact{grid-template-columns:34px minmax(48px,1fr) 34px;min-height:38px;border-radius:11px}.app-number.is-compact .app-number__input{min-height:36px;padding-inline:6px;font-size:12px}.app-number.is-compact .app-number__button{font-size:17px}
@media(max-width:760px){.app-number{grid-template-columns:46px minmax(0,1fr) 46px;min-height:48px}.app-number__input{min-height:46px;font-size:16px}.app-number.is-compact{grid-template-columns:38px minmax(46px,1fr) 38px;min-height:40px}.app-number.is-compact .app-number__input{min-height:38px;font-size:14px}}
</style>

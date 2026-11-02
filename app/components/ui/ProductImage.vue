<template>
  <span class="product-preview" :class="{'product-preview--empty': !image_url || image_failed}">
    <img
      v-if="image_url && !image_failed"
      :src="image_url"
      :alt="product?.name || 'Фото товара'"
      loading="lazy"
      decoding="async"
      @error="image_failed = true"
    >
    <span v-else class="product-preview__placeholder">Фото</span>
  </span>
</template>

<script setup>
import {computed, ref, watch} from 'vue'
import {getProductImage} from '~/utils/product-image'

const props = defineProps({product: {type: Object, default: null}})
const image_url = computed(() => getProductImage(props.product))
const image_failed = ref(false)
watch(image_url, () => { image_failed.value = false })
</script>

<style scoped>
.product-preview {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #eee5da;
}
.product-preview img {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  object-fit: cover;
  object-position: center;
}
.product-preview__placeholder {
  padding: 6px;
  color: #948270;
  font-size: 11px;
  font-weight: 750;
  text-align: center;
}
</style>

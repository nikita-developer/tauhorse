<template>
  <section class="page-section">
    <div class="container">
      <div class="admin-page-head"><div><span>Управление каталогом</span><h1 class="page-title">Товары</h1></div><button class="btn btn--primary" type="button" @click="openCreate">Добавить товар</button></div>

      <Teleport to="body">
        <Transition name="admin-drawer">
          <div v-if="editor_open" class="admin-editor" role="dialog" aria-modal="true" :aria-label="editing_id ? 'Редактирование товара' : 'Новый товар'">
            <button class="admin-editor__overlay" type="button" aria-label="Закрыть редактор" @click="closeEditor"></button>
      <form class="card admin-form" @submit.prevent="createProduct">
        <div class="admin-form__head"><div><span>{{ editing_id ? 'Редактирование' : 'Новый товар' }}</span><h2>{{ editing_id ? form_state.name : 'Добавить в каталог' }}</h2></div><button type="button" aria-label="Закрыть" @click="closeEditor">×</button></div>
        <div v-if="form_error" class="form-message form-message--error">
          {{ form_error }}
        </div>

        <div v-if="form_success" class="form-message form-message--success">
          {{ form_success }}
        </div>

        <label class="field"><span class="field__label">Название товара *</span><input v-model="form_state.name" class="field__input" type="text" placeholder="Например, Мюсли Energy Mix" required /></label>

        <label class="field"><span class="field__label">Описание</span><textarea v-model="form_state.description" class="field__textarea" placeholder="Коротко опишите назначение и особенности товара"></textarea></label>

        <label class="field"><span class="field__label">Артикул / SKU</span><input v-model="form_state.sku" class="field__input" type="text" placeholder="Например, FEED-001" /></label>
        <label class="field"><span class="field__label">Бренд</span><input v-model="form_state.brand" class="field__input" type="text" placeholder="Название производителя" /></label>
        <label class="field"><span class="field__label">Вес упаковки, кг</span><AppNumberInput v-model="form_state.package_weight_kg" :min="0.001" :step="0.001" placeholder="20" suffix="кг" aria-label="Вес упаковки" /></label>
        <div class="admin-media-field">
          <strong>Фото / GIF / видео</strong>
          <label class="admin-file-picker"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple @change="selectMedia" /><span>Выбрать фото / GIF / видео</span><small>{{ selected_media.length ? `Выбрано: ${selected_media.length}` : 'Файлы не выбраны' }}</small></label>
          <small>До 12 файлов на товар, до 25 МБ каждый. JPG, PNG, WEBP, GIF, MP4, WEBM. Первый файл показывается главным.</small>
          <div v-if="editing_media.length" class="admin-media-grid">
            <div v-for="media in editing_media" :key="media.id" class="admin-media-thumb">
              <video v-if="media.media_type === 'video'" :src="media.url" muted playsinline></video>
              <img v-else :src="media.url" alt="">
              <button type="button" aria-label="Удалить медиа" @click="removeMedia(media)">×</button>
            </div>
          </div>
          <div v-if="selected_media.length" class="admin-media-selected">Выбрано файлов: {{ selected_media.length }}. Они загрузятся при сохранении товара.</div>
        </div>
        <label class="field"><span class="field__label">Внешний URL изображения</span><input v-model="form_state.image_url" class="field__input" type="url" placeholder="Необязательно — используйте, если фото хранится вне магазина" /></label>
        <label class="field"><span class="field__label">Состав</span><textarea v-model="form_state.composition" class="field__textarea" placeholder="Состав корма или добавки"></textarea></label>
        <label class="field"><span class="field__label">Рекомендации по применению / кормлению</span><textarea v-model="form_state.feeding_guide" class="field__textarea" placeholder="Как давать и в каком количестве"></textarea></label>
        <label class="field"><span class="field__label">Страна производства</span><input v-model="form_state.country_of_origin" class="field__input" type="text" placeholder="Например, Германия" /></label>
        <label class="field"><span class="field__label">Срок годности, месяцев</span><AppNumberInput v-model="form_state.shelf_life_months" :min="1" :step="1" placeholder="12" aria-label="Срок годности в месяцах" /></label>

        <div class="admin-legal-box">
          <div class="admin-legal-box__head">
            <div><strong>Информация о товаре и документы</strong><small>Заполните применимые сведения из маркировки и разрешительной документации.</small></div>
            <span>Перед продажей</span>
          </div>
          <label class="field"><span class="field__label">Изготовитель</span><input v-model="form_state.manufacturer_name" class="field__input" type="text" maxlength="300" placeholder="Полное наименование изготовителя" /></label>
          <label class="field"><span class="field__label">Адрес изготовителя</span><textarea v-model="form_state.manufacturer_address" class="field__textarea" maxlength="500" placeholder="Адрес изготовителя, если он должен быть доведён до покупателя"></textarea></label>
          <label class="field"><span class="field__label">Условия хранения</span><textarea v-model="form_state.storage_conditions" class="field__textarea" maxlength="1500" placeholder="Например, хранить в сухом прохладном месте"></textarea></label>
          <label class="field"><span class="field__label">Ограничения / особые указания</span><textarea v-model="form_state.usage_restrictions" class="field__textarea" maxlength="2000" placeholder="Возраст, назначение, противопоказания или иные обязательные указания — если применимо"></textarea></label>
          <div class="admin-legal-box__docs">
            <label class="field"><span class="field__label">№ декларации / сертификата</span><input v-model="form_state.conformity_number" class="field__input" type="text" maxlength="250" placeholder="Если подтверждение соответствия обязательно" /></label>
            <label class="field"><span class="field__label">Ссылка на запись в реестре</span><input v-model="form_state.conformity_url" class="field__input" type="url" maxlength="2000" placeholder="https://..." /></label>
            <label class="field"><span class="field__label">Код ТН ВЭД ЕАЭС</span><input v-model="form_state.tnved_code" class="field__input" type="text" maxlength="50" placeholder="Например, 2309" /></label>
            <label class="field"><span class="field__label">Код ОКПД2</span><input v-model="form_state.okpd2_code" class="field__input" type="text" maxlength="50" placeholder="Из разрешительной документации" /></label>
            <label class="field"><span class="field__label">№ госрегистрации кормовой добавки</span><input v-model="form_state.feed_additive_registration_number" class="field__input" type="text" maxlength="250" placeholder="Если товар является кормовой добавкой и регистрация обязательна" /></label>
            <label class="field"><span class="field__label">Ссылка на реестр кормовых добавок</span><input v-model="form_state.feed_additive_registry_url" class="field__input" type="url" maxlength="2000" placeholder="https://..." /></label>
          </div>
          <small class="admin-legal-box__note">Не указывайте номер «для вида». Для каждого SKU проверьте применимость декларации/сертификата, государственной регистрации кормовой добавки и маркировки «Честный знак» по фактическим ТН ВЭД ЕАЭС и ОКПД2.</small>
        </div>

        <label class="field"><span class="field__label">Обычная цена, ₽ *</span><AppNumberInput v-model="form_state.price" :min="0.01" :step="0.01" placeholder="2500" suffix="₽" required aria-label="Обычная цена" /></label>

        <div class="admin-promo-box">
          <div class="admin-promo-box__head"><div><strong>Акция на товар</strong><small>Сниженная цена показывается в каталоге автоматически.</small></div><span v-if="Number(form_state.sale_percent)>0">−{{ Number(form_state.sale_percent) }}%</span></div>
          <label class="field"><span class="field__label">Скидка на этот товар, %</span><AppNumberInput v-model="form_state.sale_percent" :min="0" :max="70" :step="1" placeholder="0" suffix="%" aria-label="Скидка на товар" /></label>
          <label class="field"><span class="field__label">Текст на плашке</span><input v-model="form_state.promo_label" class="field__input" type="text" maxlength="60" placeholder="Например, Распродажа или Последние мешки" /></label>
          <div class="admin-promo-dates"><label class="field"><span class="field__label">Начало акции</span><input v-model="form_state.sale_starts_at" class="field__input" type="datetime-local" /></label><label class="field"><span class="field__label">Окончание акции</span><input v-model="form_state.sale_ends_at" class="field__input" type="datetime-local" /></label></div>
          <label class="admin-promo-check"><input v-model="form_state.is_featured" type="checkbox" /> <span>Выделить товар в каталоге</span></label>
          <small>0% отключает скидку. Если даты пустые, акция действует до ручного отключения.</small>
        </div>

        <label class="field"><span class="field__label">Остаток на складе, шт.</span><AppNumberInput v-model="form_state.stock" :min="0" :step="1" placeholder="20" suffix="шт." aria-label="Остаток на складе" /></label>

        <label class="field"><span class="field__label">Позиция в каталоге</span><AppNumberInput v-model="form_state.catalog_position" :min="1" :max="9999" :step="1" placeholder="1000" aria-label="Позиция в каталоге" /><small>Чем меньше число, тем выше товар в рекомендуемом порядке. Например: 1 — первым, 3 — ближе к началу, 9999 — в конце. Для обычных товаров оставьте 1000.</small></label>

        <label class="field"><span class="field__label">Категория</span><AppSelect v-model="form_state.category_id" :options="editorCategoryOptions" aria-label="Категория товара" /></label>

        <button class="btn btn--primary" :class="{'is-loading': is_saving}" :disabled="is_saving" type="submit">
          {{ is_saving ? 'Сохраняем…' : (editing_id ? 'Сохранить изменения' : 'Создать') }}
        </button>
        <button class="btn btn--secondary" type="button" @click="closeEditor">Отмена</button>
      </form>
          </div>
        </Transition>
      </Teleport>

      <section class="card admin-product-filters">
        <div class="admin-product-filters__head">
          <div><span>Фильтр админки</span><strong>Найдите нужный товар</strong></div>
          <small>{{ products_store.meta.total }} товаров</small>
        </div>
        <div class="admin-product-filters__grid">
          <label class="field"><span class="field__label">Поиск</span><input v-model="admin_filters.search" class="field__input" type="search" placeholder="Название или описание"></label>
          <label class="field"><span class="field__label">Категория</span><AppSelect v-model="admin_filters.category_id" :options="filterCategoryOptions" aria-label="Фильтр по категории" /></label>
          <label class="field"><span class="field__label">Остаток</span><AppSelect v-model="admin_filters.stock_status" :options="stockStatusOptions" aria-label="Фильтр по остатку" /></label>
          <label class="field"><span class="field__label">Акции</span><AppSelect v-model="admin_filters.on_sale" :options="saleFilterOptions" aria-label="Фильтр по акциям" /></label>
        </div>
        <div class="admin-product-filters__actions"><span>Фильтры каталога покупателей сюда не переносятся.</span><button class="btn btn--secondary" type="button" @click="resetAdminFilters">Сбросить</button></div>
      </section>

      <div v-if="products_store.items.length" class="admin-products">
        <article
            v-for="item in products_store.items"
            :key="item.id"
            class="admin-product-card"
        >
          <div class="admin-product-card__image">
            <video v-if="item.media?.[0]?.media_type === 'video'" :src="item.media[0].url" muted playsinline></video>
            <img v-else-if="item.media?.find(media => media.media_type === 'image')?.url || item.image_url" :src="item.media?.find(media => media.media_type === 'image')?.url || item.image_url" :alt="item.name" loading="lazy">
            <span v-else>Нет медиа</span>
          </div>

          <div class="admin-product-card__main">
            <div class="admin-product-card__badges">
              <span>{{ item.category?.name || 'Без категории' }}</span>
              <span :class="{'is-low': item.stock <= 5}">{{ item.stock }} шт.</span>
              <span class="is-position">Позиция {{ item.catalog_position || 1000 }}</span>
            </div>
            <strong>{{ item.name }}</strong>
            <small>{{ item.sku || 'Артикул не указан' }}</small>
          </div>

          <div class="admin-product-card__price"><span v-if="item.promotion_active">{{ formatPrice(item.regular_price) }}</span><strong>{{ formatPrice(item.effective_price ?? item.price) }}</strong></div>

          <div class="admin-product-overlay">
            <template v-if="delete_id === item.id">
              <div class="admin-confirm">
                <span>Удалить?</span>
                <button class="btn btn--danger" :class="{'is-loading': is_deleting}" :disabled="is_deleting" @click="confirmDelete">{{ is_deleting ? 'Удаляем…' : 'Да' }}</button>
                <button class="btn btn--secondary" @click="cancelDelete">Нет</button>
              </div>
            </template>

            <template v-else>
              <button class="btn btn--secondary" type="button" @click="startEdit(item)">Изменить</button>
              <button
                  class="admin-delete-btn"
                  @click="askDelete(item.id)"
              >
                ✕
              </button>
            </template>
          </div>
        </article>
      </div>
      <div v-else class="admin-products-empty">
        <h2>Товаров пока нет</h2>
        <p>Добавьте первый товар — он появится здесь и в каталоге.</p>
        <button class="btn btn--primary" type="button" @click="openCreate">Добавить товар</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import AppNumberInput from '~/components/ui/AppNumberInput.vue'
import AppSelect from '~/components/ui/AppSelect.vue'
definePageMeta({
  layout: 'admin',
  middleware: 'staff'
})

import {useProductsStore} from '~/stores/products'
import {useCategoriesStore} from '~/stores/categories'

const products_store = useProductsStore()
const categories_store = useCategoriesStore()
const editorCategoryOptions=computed(()=>[{value:null,label:'Без категории'},...categories_store.items.map(item=>({value:item.id,label:item.name}))])
const filterCategoryOptions=computed(()=>[{value:'',label:'Все категории'},...categories_store.items.map(item=>({value:item.id,label:item.name}))])
const stockStatusOptions=[{value:'',label:'Любой'},{value:'in_stock',label:'В наличии'},{value:'low_stock',label:'Мало (1–5)'},{value:'out_of_stock',label:'Нет в наличии'}]
const saleFilterOptions=[{value:'',label:'Все товары'},{value:'true',label:'Только со скидкой'}]

const form_error = ref('')
const form_success = ref('')
const is_saving = ref(false)
const is_deleting = ref(false)
const editor_open = ref(false)
const notifications = useNotificationsStore()

const delete_id = ref(null)
const editing_id = ref(null)
const selected_media = ref([])
const editing_media = ref([])
const ADMIN_FILTER_STORAGE_KEY = 'tauhorse:admin-product-filters:v1'
let saved_admin_filters = {}
if (import.meta.client) {
  try { saved_admin_filters = JSON.parse(localStorage.getItem(ADMIN_FILTER_STORAGE_KEY) || '{}') || {} } catch { saved_admin_filters = {} }
}
const admin_filters = reactive({search: '', category_id: '', stock_status: '', on_sale: '', ...saved_admin_filters})
let admin_filter_timeout = null
const persistAdminFilters = () => {
  if (!import.meta.client) return
  try { localStorage.setItem(ADMIN_FILTER_STORAGE_KEY, JSON.stringify({...admin_filters})) } catch {}
}
const loadAdminProducts = () => products_store.fetchProducts({page:1,limit:100,search:admin_filters.search,category_id:admin_filters.category_id,stock_status:admin_filters.stock_status,on_sale:admin_filters.on_sale === 'true'}, {replace:true,persist:false})
const resetAdminFilters = async () => { Object.assign(admin_filters,{search:'',category_id:'',stock_status:'',on_sale:''}); persistAdminFilters(); await loadAdminProducts() }
watch(admin_filters, () => { persistAdminFilters(); clearTimeout(admin_filter_timeout); admin_filter_timeout=setTimeout(()=>loadAdminProducts(),300) }, {deep:true})

const formatPrice = value => new Intl.NumberFormat('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0}).format(Number(value || 0))
const toDatetimeLocal = value => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}
const localDatetimeToIso = value => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const askDelete = id => {
  delete_id.value = id
}

const cancelDelete = () => {
  delete_id.value = null
}

const confirmDelete = async () => {
  if (!delete_id.value) return

  form_error.value = ''
  form_success.value = ''

  try {
    is_deleting.value = true
    await products_store.deleteProduct(delete_id.value)

    form_success.value = 'Товар удалён'
    delete_id.value = null

    await loadAdminProducts()
  } catch (error) {
    form_error.value =
        error?.data?.message ||
        error?.response?._data?.message ||
        'Не удалось удалить товар'
  } finally {
    is_deleting.value = false
  }
}

const form_state = reactive({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  category_id: null,
  sku: '', brand: '', package_weight_kg: '', image_url: '', composition: '', feeding_guide: '', country_of_origin: '', shelf_life_months: '',
  manufacturer_name: '', manufacturer_address: '', storage_conditions: '', usage_restrictions: '', conformity_number: '', conformity_url: '', tnved_code: '', okpd2_code: '', feed_additive_registration_number: '', feed_additive_registry_url: '',
  sale_percent: 0, promo_label: '', sale_starts_at: '', sale_ends_at: '', is_featured: false, catalog_position: 1000
})

const resetForm = () => {
  Object.assign(form_state, {
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category_id: null,
    sku: '', brand: '', package_weight_kg: '', image_url: '', composition: '', feeding_guide: '', country_of_origin: '', shelf_life_months: '',
  manufacturer_name: '', manufacturer_address: '', storage_conditions: '', usage_restrictions: '', conformity_number: '', conformity_url: '', tnved_code: '', okpd2_code: '', feed_additive_registration_number: '', feed_additive_registry_url: '',
  sale_percent: 0, promo_label: '', sale_starts_at: '', sale_ends_at: '', is_featured: false, catalog_position: 1000
  })
  editing_id.value = null
  selected_media.value = []
  editing_media.value = []
}

const closeEditor = () => {
  if (is_saving.value) return
  editor_open.value = false
  resetForm()
  document.body.classList.remove('mobile-menu-open')
}

const openCreate = () => {
  resetForm()
  form_error.value = ''
  form_success.value = ''
  editor_open.value = true
  document.body.classList.add('mobile-menu-open')
}

const startEdit = item => {
  editing_id.value = item.id
  Object.assign(form_state, {
    name: item.name || '', description: item.description || '', price: Number(item.price), stock: item.stock,
    category_id: item.category_id, sku: item.sku || '', brand: item.brand || '',
    package_weight_kg: item.package_weight_kg || '', image_url: item.image_url || '', composition: item.composition || '',
    feeding_guide: item.feeding_guide || '', country_of_origin: item.country_of_origin || '', shelf_life_months: item.shelf_life_months || '',
    manufacturer_name: item.manufacturer_name || '', manufacturer_address: item.manufacturer_address || '', storage_conditions: item.storage_conditions || '', usage_restrictions: item.usage_restrictions || '', conformity_number: item.conformity_number || '', conformity_url: item.conformity_url || '', tnved_code: item.tnved_code || '', okpd2_code: item.okpd2_code || '', feed_additive_registration_number: item.feed_additive_registration_number || '', feed_additive_registry_url: item.feed_additive_registry_url || '',
    sale_percent: Number(item.sale_percent || 0), promo_label: item.promo_label || '', sale_starts_at: toDatetimeLocal(item.sale_starts_at), sale_ends_at: toDatetimeLocal(item.sale_ends_at), is_featured: item.is_featured === true, catalog_position: Number(item.catalog_position || 1000)
  })
  editing_media.value = [...(item.media || [])]
  selected_media.value = []
  form_error.value = ''
  form_success.value = ''
  editor_open.value = true
  document.body.classList.add('mobile-menu-open')
}

const selectMedia = event => {
  const files = Array.from(event.target.files || [])
  if (files.length > 8) {
    form_error.value = 'За один раз можно выбрать не более 8 файлов'
    event.target.value = ''
    return
  }
  selected_media.value = files
}

const removeMedia = async media => {
  if (!editing_id.value || !media?.id) return
  try {
    await products_store.deleteMedia(editing_id.value, media.id)
    editing_media.value = editing_media.value.filter(item => item.id !== media.id)
    notifications.success('Медиафайл удалён')
  } catch (error) {
    form_error.value = error?.data?.message || error?.response?._data?.message || 'Не удалось удалить медиафайл'
  }
}

const createProduct = async () => {
  form_error.value = ''
  form_success.value = ''

  const payload = {
    name: form_state.name.trim(),
    description: form_state.description.trim(),
    price: Number(form_state.price),
    stock: Number(form_state.stock ?? 0),
    category_id:
        form_state.category_id === null || form_state.category_id === ''
            ? null
            : Number(form_state.category_id),
    sku: form_state.sku, brand: form_state.brand, package_weight_kg: form_state.package_weight_kg,
    image_url: form_state.image_url, composition: form_state.composition, feeding_guide: form_state.feeding_guide,
    country_of_origin: form_state.country_of_origin, shelf_life_months: form_state.shelf_life_months,
    manufacturer_name: form_state.manufacturer_name, manufacturer_address: form_state.manufacturer_address,
    storage_conditions: form_state.storage_conditions, usage_restrictions: form_state.usage_restrictions,
    conformity_number: form_state.conformity_number, conformity_url: form_state.conformity_url, tnved_code: form_state.tnved_code, okpd2_code: form_state.okpd2_code, feed_additive_registration_number: form_state.feed_additive_registration_number, feed_additive_registry_url: form_state.feed_additive_registry_url,
    sale_percent: Number(form_state.sale_percent || 0), promo_label: form_state.promo_label,
    sale_starts_at: localDatetimeToIso(form_state.sale_starts_at), sale_ends_at: localDatetimeToIso(form_state.sale_ends_at),
    is_featured: form_state.is_featured === true,
    catalog_position: Number(form_state.catalog_position || 1000)
  }

  if (!payload.name) {
    form_error.value = 'Введите название товара'
    return
  }

  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    form_error.value = 'Цена должна быть больше 0'
    return
  }

  if (!Number.isFinite(payload.stock) || payload.stock < 0) {
    form_error.value = 'Остаток не может быть меньше 0'
    return
  }

  if (!Number.isSafeInteger(payload.catalog_position) || payload.catalog_position < 1 || payload.catalog_position > 9999) {
    form_error.value = 'Позиция в каталоге должна быть целым числом от 1 до 9999'
    return
  }

  try {
    is_saving.value = true
    const saved_product = editing_id.value
      ? await products_store.updateProduct(editing_id.value, payload)
      : await products_store.createProduct(payload)
    if (selected_media.value.length) await products_store.uploadMedia(saved_product.id, selected_media.value)

    const success_message = editing_id.value ? 'Товар обновлён' : 'Товар успешно создан'
    form_success.value = success_message
    notifications.success(success_message)
    await loadAdminProducts()
    editor_open.value = false
    resetForm()
    document.body.classList.remove('mobile-menu-open')
  } catch (error) {
    form_error.value =
        error?.data?.message ||
        error?.response?._data?.message ||
        'Не удалось создать товар'
  } finally {
    is_saving.value = false
  }
}

await Promise.all([
  useAsyncData('admin-products', () => loadAdminProducts()),
  useAsyncData('admin-product-categories', () => categories_store.fetchCategories())
])

onBeforeUnmount(() => { clearTimeout(admin_filter_timeout); document.body.classList.remove('mobile-menu-open') })
</script>

<style scoped lang="scss">
.admin-form {
  display: grid;
  gap: 16px;
  position: relative;
  z-index: 2;
  width: min(560px, calc(100vw - 18px));
  height: 100dvh;
  margin-left: auto;
  padding: 24px;
  overflow-y: auto;
  border-radius: 26px 0 0 26px;
}
.admin-page-head { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.admin-page-head span { color: #8a6a42; font-size: 12px; font-weight: 750; text-transform: uppercase; }
.admin-page-head .page-title { margin: 6px 0 0; }
.admin-editor { position: fixed; inset: 0; z-index: 10050; display: flex; justify-content: flex-end; }
.admin-editor__overlay { position: absolute; inset: 0; border: 0; background: rgba(28,20,12,.44); backdrop-filter: blur(3px); }
.admin-form__head { display: flex; align-items: start; justify-content: space-between; gap: 16px; padding-bottom: 14px; border-bottom: 1px solid rgba(111,82,48,.1); }
.admin-form__head span { color: #8b6a45; font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.admin-form__head h2 { margin: 4px 0 0; color: #342719; font-size: 24px; }
.admin-form__head button { flex: 0 0 40px; width: 40px; height: 40px; border: 1px solid rgba(111,82,48,.12); border-radius: 50%; background: #fff; color: #66513b; font-size: 23px; cursor: pointer; }
.admin-drawer-enter-active, .admin-drawer-leave-active { transition: opacity .25s ease; }
.admin-drawer-enter-active .admin-form, .admin-drawer-leave-active .admin-form { transition: transform .28s ease; }
.admin-drawer-enter-from, .admin-drawer-leave-to { opacity: 0; }
.admin-drawer-enter-from .admin-form, .admin-drawer-leave-to .admin-form { transform: translateX(100%); }

.admin-products {
  display: grid;
  gap: 10px;
}

.admin-product-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 16px;
  min-height: 94px;
  padding: 11px 14px 11px 11px;
  border: 1px solid rgba(111, 82, 48, .1);
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 7px 20px rgba(48, 32, 17, .035);
}

.admin-product-card__image {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border-radius: 12px;
  background: #eee6da;
  color: #98836b;
  font-size: 10px;
  font-weight: 700;
}
.admin-product-card__image img, .admin-product-card__image video { width: 100%; height: 100%; object-fit: cover; }
.admin-media-field { display: grid; gap: 8px; }
.admin-media-field small { color: #75644f; line-height: 1.45; }
.admin-media-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.admin-media-thumb { position: relative; aspect-ratio: 1; overflow: hidden; border-radius: 12px; background: #f4efe8; }
.admin-media-thumb img, .admin-media-thumb video { width: 100%; height: 100%; object-fit: cover; }
.admin-media-thumb button { position: absolute; top: 4px; right: 4px; width: 28px; height: 28px; border: 0; border-radius: 50%; background: rgba(255,255,255,.9); cursor: pointer; }
.admin-media-selected { font-size: 13px; color: #6f5230; }
.admin-product-card__main { min-width: 0; }
.admin-product-card__main strong { display: block; margin: 6px 0 4px; overflow: hidden; color: #382a1d; font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
.admin-product-card__main small { color: #978876; }
.admin-product-card__badges { display: flex; gap: 6px; }
.admin-product-card__badges span { padding: 4px 7px; border-radius: 999px; background: #f1ebe2; color: #70593e; font-size: 10px; font-weight: 750; }
.admin-product-card__badges span:last-child { background: #e9f4eb; color: #39704a; }
.admin-product-card__badges span.is-low { background: #fbe9e6; color: #a64d42; }
.admin-product-card__badges span.is-position { background:#eee8f6; color:#67527d; }
.admin-product-card__price{display:grid;justify-items:end;min-width:92px}.admin-product-card__price span{color:#a09283;font-size:11px;text-decoration:line-through}.admin-product-card__price strong{color:#3b2c1e;font-size:17px;font-weight:850}
.admin-product-overlay { display: flex; align-items: center; justify-content: flex-end; gap: 7px; min-width: 122px; }
.admin-product-overlay .btn { min-height: 38px; padding: 8px 12px; font-size: 12px; }
.admin-delete-btn { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 10px; background: #f8efed; color: #a54d43; cursor: pointer; }
.admin-delete-btn:hover { background: #f4dfdc; }
.admin-confirm { display: flex; align-items: center; gap: 6px; }
.admin-confirm span { color: #8d5148; font-size: 12px; font-weight: 700; }
.admin-products-empty { display: grid; justify-items: center; gap: 10px; padding: 52px 24px; border: 1px dashed rgba(111,82,48,.22); border-radius: 22px; background: #fff; text-align: center; }
.admin-products-empty h2, .admin-products-empty p { margin: 0; }
.admin-products-empty p { margin-bottom: 10px; color: #756b60; }


.admin-product-filters{display:grid;gap:14px;margin-bottom:18px;padding:18px;border-radius:18px}.admin-product-filters__head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.admin-product-filters__head div{display:grid;gap:3px}.admin-product-filters__head span{color:#896742;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.admin-product-filters__head strong{color:#3a2c1e}.admin-product-filters__head small{color:#85796c}.admin-product-filters__grid{display:grid;grid-template-columns:1.5fr repeat(3,minmax(150px,1fr));gap:10px}.admin-product-filters__actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.admin-product-filters__actions>span{color:#8a7d70;font-size:11px}.admin-product-filters__actions .btn{min-height:38px;padding:8px 12px;font-size:12px}.admin-promo-box{display:grid;gap:13px;padding:16px;border:1px solid rgba(111,82,48,.12);border-radius:16px;background:#faf6ef}.admin-promo-box__head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.admin-promo-box__head>div{display:grid;gap:4px}.admin-promo-box__head small{color:#85786b}.admin-promo-box__head>span{padding:6px 9px;border-radius:999px;background:#8b4c3b;color:#fff;font-size:11px;font-weight:800}.admin-promo-dates{display:grid;grid-template-columns:1fr 1fr;gap:10px}.admin-file-picker{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:6px 12px;padding:14px;border:1px dashed rgba(111,82,48,.28);border-radius:14px;background:#fbf8f3;cursor:pointer}.admin-file-picker input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.admin-file-picker>span{grid-row:1/3;padding:10px 13px;border-radius:10px;background:#75603f;color:#fff;font-size:12px;font-weight:750}.admin-file-picker>small{color:#837669}.admin-media-field>strong{color:#3b2d20;font-size:14px}.admin-form .field__label{color:#695949;font-size:12px;font-weight:750}.admin-form .field{gap:6px}.admin-promo-check{display:flex;align-items:center;gap:9px;color:#675849;font-size:12px;font-weight:700}.admin-promo-check input{width:18px;height:18px;accent-color:#75603f}
.admin-legal-box{display:grid;gap:13px;padding:16px;border:1px solid rgba(83,107,65,.2);border-radius:16px;background:#f7f9f3}.admin-legal-box__head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.admin-legal-box__head>div{display:grid;gap:4px}.admin-legal-box__head strong{color:#33452d}.admin-legal-box__head small,.admin-legal-box__note{color:#6f786a;line-height:1.5}.admin-legal-box__head>span{flex:0 0 auto;padding:5px 8px;border-radius:999px;background:#e3eadc;color:#49603f;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.admin-legal-box__docs{display:grid;grid-template-columns:1fr 1.25fr;gap:10px}@media(max-width:600px){.admin-legal-box__docs{grid-template-columns:1fr}.admin-legal-box__head{flex-direction:column}.admin-legal-box__head>span{align-self:flex-start}}
@media(max-width:980px){.admin-product-filters__grid{grid-template-columns:1fr 1fr}}@media(max-width:600px){.admin-product-filters__grid,.admin-promo-dates{grid-template-columns:1fr}.admin-product-filters__actions{align-items:flex-start;flex-direction:column}.admin-file-picker{grid-template-columns:1fr}.admin-file-picker>span{grid-row:auto;text-align:center}}
@media (max-width: 760px) {
  .admin-page-head { align-items: stretch; flex-direction: column; }
  .admin-product-card { grid-template-columns: 62px minmax(0, 1fr) auto; gap: 11px; min-height: 84px; }
  .admin-product-card__image { width: 62px; height: 62px; }
  .admin-product-card__price { min-width: 0; font-size: 15px; }
  .admin-product-overlay { grid-column: 2 / -1; justify-content: flex-start; min-width: 0; padding-top: 8px; border-top: 1px solid rgba(111,82,48,.08); }
}

@media (max-width: 460px) {
  .admin-product-card { grid-template-columns: 56px minmax(0, 1fr); }
  .admin-product-card__image { width: 56px; height: 56px; }
  .admin-product-card__price { grid-column: 2; text-align: left; }
  .admin-product-overlay { grid-column: 1 / -1; }
}

.form-message {
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 4px;
  font-size: 14px;
}

.form-message--error {
  background: #fde8e8;
  color: #b42318;
  border: 1px solid #f5c2c7;
}

.form-message--success {
  background: #e8f7ee;
  color: #166534;
  border: 1px solid #b7ebc6;
}

.btn--danger {
  background: #b42318;
  color: white;
}

@media (max-width: 900px) {
  .admin-products {
    grid-template-columns: 1fr;
  }
  .admin-page-head { align-items: stretch; flex-direction: column; }
  .admin-form { border-radius: 22px 0 0 22px; padding: 18px; }
}
</style>

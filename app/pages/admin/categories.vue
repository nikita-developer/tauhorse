<template>
  <section class="categories-page page-section">
    <div class="container">
      <header class="categories-head">
        <div>
          <span>Структура каталога</span>
          <h1>Категории</h1>
          <p>Объединяйте товары в понятные покупателю разделы.</p>
        </div>
        <button class="btn btn--primary" type="button" @click="openCreate">Добавить категорию</button>
      </header>

      <div class="categories-toolbar">
        <label class="field categories-toolbar__search"><span class="field__label">Поиск по категориям</span><input v-model="category_search" class="field__input" type="search" placeholder="Название, описание или slug"></label>
        <span class="categories-toolbar__count">Показано: {{ filtered_categories.length }} из {{ categories_store.items.length }}</span>
      </div>

      <div v-if="categories_store.is_loading && !categories_store.items.length" class="categories-grid">
        <div v-for="item in 4" :key="item" class="category-skeleton skeleton"></div>
      </div>

      <div v-else-if="filtered_categories.length" class="categories-grid">
        <article v-for="(item, index) in filtered_categories" :key="item.id" class="category-admin-card">
          <div class="category-admin-card__top">
            <span class="category-admin-card__number">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="category-admin-card__count">{{ item._count?.products || 0 }} {{ productWord(item._count?.products || 0) }}</span>
          </div>
          <div class="category-admin-card__content">
            <h2>{{ item.name }}</h2>
            <p>{{ item.description || 'Описание категории пока не заполнено.' }}</p>
            <code>/{{ item.slug }}</code>
          </div>
          <div class="category-admin-card__actions">
            <button class="btn btn--secondary" type="button" @click="openEdit(item)">Редактировать</button>
            <template v-if="confirming_id === item.id">
              <span>Точно удалить?</span>
              <button class="category-admin-card__confirm" type="button" :disabled="deleting_id !== null" @click="removeCategory(item.id)">{{ deleting_id === item.id ? 'Удаляем…' : 'Да' }}</button>
              <button class="category-admin-card__cancel" type="button" @click="confirming_id = null">Нет</button>
            </template>
            <button v-else class="category-admin-card__delete" type="button" @click="confirming_id = item.id">Удалить</button>
          </div>
        </article>
      </div>

      <div v-else class="categories-empty">
        <h2>{{ category_search ? 'Категории не найдены' : 'Категорий пока нет' }}</h2>
        <p>{{ category_search ? 'Измените строку поиска или сбросьте фильтр.' : 'Создайте первый раздел, чтобы покупателям было проще ориентироваться.' }}</p>
        <button class="btn btn--primary" type="button" @click="openCreate">Создать категорию</button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="category-drawer">
        <div v-if="editor_open" class="category-editor" role="dialog" aria-modal="true" :aria-label="editing_id ? 'Редактирование категории' : 'Новая категория'">
          <button class="category-editor__overlay" type="button" aria-label="Закрыть редактор" @click="closeEditor"></button>
          <form class="category-editor__panel" @submit.prevent="saveCategory">
            <div class="category-editor__head">
              <div><span>{{ editing_id ? 'Редактирование' : 'Новый раздел' }}</span><h2>{{ editing_id ? 'Изменить категорию' : 'Добавить категорию' }}</h2></div>
              <button type="button" aria-label="Закрыть" @click="closeEditor">×</button>
            </div>
            <p class="category-editor__hint">Название увидит покупатель в фильтре и карточках товаров. Описание поможет понять назначение раздела.</p>
            <label class="field"><span>Название</span><input v-model="form_state.name" class="field__input" type="text" maxlength="100" placeholder="Например, Кормовые добавки" required></label>
            <label class="field"><span>Описание</span><textarea v-model="form_state.description" class="field__textarea" maxlength="500" placeholder="Коротко расскажите, какие товары находятся в разделе"></textarea></label>
            <p v-if="form_error" class="form-message form-message--error">{{ form_error }}</p>
            <div class="category-editor__actions">
              <button class="btn btn--primary" :class="{'is-loading': is_saving}" :disabled="is_saving" type="submit">{{ is_saving ? 'Сохраняем…' : (editing_id ? 'Сохранить' : 'Создать категорию') }}</button>
              <button class="btn btn--secondary" type="button" :disabled="is_saving" @click="closeEditor">Отмена</button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup>
definePageMeta({layout: 'admin', middleware: 'staff'})

import {useCategoriesStore} from '~/stores/categories'
import {useNotificationsStore} from '~/stores/notifications'

const categories_store = useCategoriesStore()
const notifications = useNotificationsStore()
const editor_open = ref(false)
const editing_id = ref(null)
const confirming_id = ref(null)
const deleting_id = ref(null)
const is_saving = ref(false)
const form_error = ref('')
const form_state = reactive({name: '', description: ''})
const category_search = ref('')
const filtered_categories = computed(() => {
  const q = category_search.value.trim().toLowerCase()
  if (!q) return categories_store.items
  return categories_store.items.filter(item => [item.name, item.description, item.slug].some(value => String(value || '').toLowerCase().includes(q)))
})

const resetForm = () => {
  form_state.name = ''
  form_state.description = ''
  editing_id.value = null
  form_error.value = ''
}
const lockPage = () => document.body.classList.add('mobile-menu-open')
const unlockPage = () => document.body.classList.remove('mobile-menu-open')
const openCreate = () => {
  resetForm()
  editor_open.value = true
  lockPage()
}
const openEdit = item => {
  editing_id.value = item.id
  form_state.name = item.name || ''
  form_state.description = item.description || ''
  form_error.value = ''
  editor_open.value = true
  lockPage()
}
const closeEditor = () => {
  if (is_saving.value) return
  editor_open.value = false
  resetForm()
  unlockPage()
}

const saveCategory = async () => {
  const payload = {name: form_state.name.trim(), description: form_state.description.trim()}
  if (!payload.name) {
    form_error.value = 'Введите название категории'
    return
  }
  is_saving.value = true
  form_error.value = ''
  try {
    const wasEditing = Boolean(editing_id.value)
    if (wasEditing) await categories_store.updateCategory(editing_id.value, payload)
    else await categories_store.createCategory(payload)
    notifications.success(wasEditing ? 'Категория обновлена' : 'Категория создана')
    await categories_store.fetchCategories()
    editor_open.value = false
    resetForm()
    unlockPage()
  } catch (error) {
    form_error.value = error?.data?.message || error?.response?._data?.message || 'Не удалось сохранить категорию'
  } finally {
    is_saving.value = false
  }
}

const removeCategory = async id => {
  deleting_id.value = id
  try {
    await categories_store.deleteCategory(id)
    notifications.info('Категория удалена')
    confirming_id.value = null
    await categories_store.fetchCategories()
  } catch (error) {
    notifications.error(error?.data?.message || 'Не удалось удалить категорию. Возможно, в ней остались товары.')
  } finally {
    deleting_id.value = null
  }
}

const productWord = count => count % 10 === 1 && count % 100 !== 11 ? 'товар' : count % 10 >= 2 && count % 10 <= 4 && !(count % 100 >= 12 && count % 100 <= 14) ? 'товара' : 'товаров'

onBeforeUnmount(unlockPage)
await useAsyncData('admin-categories', () => categories_store.fetchCategories())
</script>

<style scoped lang="scss">
.categories-toolbar{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:18px;padding:16px;border:1px solid rgba(111,82,48,.1);border-radius:17px;background:#fff}.categories-toolbar__search{width:min(460px,100%)}.categories-toolbar__count{padding-bottom:11px;color:#85796c;font-size:12px;font-weight:700}@media(max-width:640px){.categories-toolbar{align-items:stretch;flex-direction:column}.categories-toolbar__count{padding:0}}
.categories-page { min-height: calc(100dvh - 124px); background: #f8f5ef; }
.categories-head { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 26px; }
.categories-head span { color: #896742; font-size: 12px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
.categories-head h1 { margin: 6px 0 7px; color: #312418; font-size: 40px; letter-spacing: -.035em; }
.categories-head p { margin: 0; color: #756b60; }
.categories-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.category-admin-card { display: grid; gap: 22px; min-height: 260px; padding: 22px; border: 1px solid rgba(111,82,48,.11); border-radius: 22px; background: #fff; box-shadow: 0 12px 30px rgba(48,32,17,.045); }
.category-admin-card__top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.category-admin-card__number { color: #c1ad93; font-size: 13px; font-weight: 800; }
.category-admin-card__count { padding: 7px 10px; border-radius: 999px; background: #efe6da; color: #6f5230; font-size: 12px; font-weight: 750; }
.category-admin-card__content { align-self: center; }
.category-admin-card h2 { margin: 0 0 10px; color: #342719; font-size: 25px; letter-spacing: -.025em; }
.category-admin-card p { min-height: 46px; margin: 0 0 14px; color: #72685e; font-size: 14px; line-height: 1.6; }
.category-admin-card code { color: #9a8975; font-size: 12px; }
.category-admin-card__actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding-top: 16px; border-top: 1px solid rgba(111,82,48,.09); }
.category-admin-card__actions > span { color: #8d5148; font-size: 12px; font-weight: 700; }
.category-admin-card__delete, .category-admin-card__confirm, .category-admin-card__cancel { padding: 8px 10px; border: 0; border-radius: 9px; background: transparent; font-size: 12px; font-weight: 700; cursor: pointer; }
.category-admin-card__delete { margin-left: auto; color: #a3564c; }
.category-admin-card__delete:hover { background: #fbecea; }
.category-admin-card__confirm { background: #a94f45; color: #fff; }
.category-admin-card__cancel { background: #eee8df; color: #594735; }
.category-skeleton { min-height: 260px; border-radius: 22px; }
.categories-empty { display: grid; justify-items: center; gap: 10px; padding: 56px 24px; border: 1px dashed rgba(111,82,48,.22); border-radius: 24px; background: #fff; text-align: center; }
.categories-empty h2, .categories-empty p { margin: 0; }
.categories-empty p { margin-bottom: 12px; color: #756b60; }
.category-editor { position: fixed; inset: 0; z-index: 10050; display: flex; justify-content: flex-end; }
.category-editor__overlay { position: absolute; inset: 0; border: 0; background: rgba(29,21,13,.44); backdrop-filter: blur(3px); }
.category-editor__panel { position: relative; z-index: 1; display: grid; align-content: start; gap: 18px; width: min(500px, calc(100vw - 18px)); height: 100dvh; padding: 26px; overflow-y: auto; border-radius: 26px 0 0 26px; background: #fcfaf6; box-shadow: -24px 0 60px rgba(38,25,12,.16); }
.category-editor__head { display: flex; align-items: start; justify-content: space-between; gap: 16px; padding-bottom: 17px; border-bottom: 1px solid rgba(111,82,48,.1); }
.category-editor__head span { color: #8b6a45; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.category-editor__head h2 { margin: 5px 0 0; color: #342719; font-size: 25px; }
.category-editor__head button { width: 40px; height: 40px; border: 1px solid rgba(111,82,48,.12); border-radius: 50%; background: #fff; color: #66513b; font-size: 23px; cursor: pointer; }
.category-editor__hint { margin: 0; padding: 14px; border-radius: 14px; background: #f0e8dc; color: #756756; font-size: 13px; line-height: 1.55; }
.category-editor__actions { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-top: 4px; }
.field { display: grid; gap: 7px; color: #625344; font-size: 13px; font-weight: 700; }
.form-message { margin: 0; padding: 12px 14px; border-radius: 11px; font-size: 13px; }
.form-message--error { border: 1px solid #f5c2c7; background: #fde8e8; color: #a43e35; }
.category-drawer-enter-active, .category-drawer-leave-active { transition: opacity .24s ease; }
.category-drawer-enter-active .category-editor__panel, .category-drawer-leave-active .category-editor__panel { transition: transform .28s ease; }
.category-drawer-enter-from, .category-drawer-leave-to { opacity: 0; }
.category-drawer-enter-from .category-editor__panel, .category-drawer-leave-to .category-editor__panel { transform: translateX(100%); }
@media (max-width: 760px) { .categories-head { align-items: stretch; flex-direction: column; } .categories-head h1 { font-size: 34px; } .categories-grid { grid-template-columns: 1fr; } .category-editor__panel { padding: 19px; border-radius: 22px 0 0 22px; } }
@media (max-width: 480px) { .category-admin-card { min-height: 230px; padding: 18px; } .category-editor__actions { grid-template-columns: 1fr; } }
</style>

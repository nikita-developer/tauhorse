<template>
  <header class="the-header" :class="{ 'the-header--menu-open': is_mobile_menu_open }">
    <div class="container">
      <div class="the-header__inner">
        <NuxtLink to="/" class="the-header__logo" aria-label="TauHorse — на главную" @click="closeMobileMenu">
          <img class="the-header__logo-mark" src="/brand/tauhorse-logo.webp" width="180" height="95" alt="" aria-hidden="true">
          <span class="the-header__logo-title">TauHorse</span>
        </NuxtLink>

        <nav class="the-header__nav the-header__nav--desktop">
          <NuxtLink to="/" class="the-header__nav-link">Каталог</NuxtLink>

          <NuxtLink to="/cart" class="the-header__nav-link the-header__nav-link--cart">
            Корзина
            <span class="the-header__cart-badge" v-if="cart_store.is_loaded">
              {{ cart_store.items_count }}
            </span>
          </NuxtLink>

          <ClientOnly>
            <template #default>
              <NuxtLink
                  :to="orders_link"
                  class="the-header__nav-link"
              >
                Мои заказы
              </NuxtLink>

              <NuxtLink
                  v-if="auth_store.is_authenticated"
                  to="/account"
                  class="the-header__nav-link"
              >
                Кабинет
              </NuxtLink>

              <NuxtLink
                  v-if="['admin','manager'].includes(auth_store.user?.role)"
                  to="/admin"
                  class="the-header__nav-link"
              >
                Админка
              </NuxtLink>
            </template>

            <template #fallback>
              <span class="the-header__nav-placeholder"></span>
            </template>
          </ClientOnly>
        </nav>

        <div class="the-header__actions the-header__actions--desktop">
          <ClientOnly>
            <template #default>
              <template v-if="auth_store.is_authenticated">
                <NuxtLink to="/account" class="the-header__user">{{ auth_store.user?.email }}</NuxtLink>

                <button class="btn btn--secondary" type="button" @click="handleLogout">
                  Выйти
                </button>
              </template>

              <template v-else>
                <NuxtLink to="/login" class="btn btn--secondary">Войти</NuxtLink>
                <NuxtLink to="/register" class="btn btn--primary">Регистрация</NuxtLink>
              </template>
            </template>

            <template #fallback>
              <div class="the-header__actions-placeholder"></div>
            </template>
          </ClientOnly>
        </div>

        <div class="the-header__mobile-controls">
          <NuxtLink
              to="/cart"
              class="the-header__mobile-cart"
              aria-label="Перейти в корзину"
              @click="closeMobileMenu"
          >
            <span class="the-header__mobile-cart-icon"></span>
            <span class="the-header__cart-badge" v-if="cart_store.is_loaded">
              {{ cart_store.items_count }}
            </span>
          </NuxtLink>

          <button
              class="the-header__burger"
              type="button"
              :aria-expanded="is_mobile_menu_open ? 'true' : 'false'"
              :aria-label="is_mobile_menu_open ? 'Закрыть меню' : 'Открыть меню'"
              @click="toggleMobileMenu"
          >
            <span class="the-header__burger-lines" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="the-header__burger-label">{{ is_mobile_menu_open ? 'Закрыть' : 'Меню' }}</span>
          </button>
        </div>
      </div>
    </div>

    <transition name="header-mobile-fade">
      <div
          v-if="is_mobile_menu_open"
          class="the-header__mobile-overlay"
          @click="closeMobileMenu"
      ></div>
    </transition>

    <transition name="header-mobile-panel">
      <div v-if="is_mobile_menu_open" class="the-header__mobile-menu">
          <div class="the-header__mobile-menu-inner">
            <div class="the-header__mobile-heading">
              <div><span>Навигация</span><strong>Куда направимся?</strong></div>
              <button type="button" aria-label="Закрыть меню" @click="closeMobileMenu">×</button>
            </div>
            <nav class="the-header__mobile-nav">
              <NuxtLink to="/" class="the-header__mobile-link" @click="closeMobileMenu">
                <span class="the-header__mobile-link-icon">⌂</span><span><strong>Каталог</strong><small>Корма и лизунцы</small></span><i>→</i>
              </NuxtLink>

              <NuxtLink to="/cart" class="the-header__mobile-link" @click="closeMobileMenu">
                <span class="the-header__mobile-link-icon">◫</span><span><strong>Корзина</strong><small>Выбранные товары</small></span>
                  <span class="the-header__cart-badge" v-if="cart_store.is_loaded">
                  {{ cart_store.items_count }}
                </span>
              </NuxtLink>

              <ClientOnly>
                <template #default>
                  <NuxtLink
                      :to="orders_link"
                      class="the-header__mobile-link"
                      @click="closeMobileMenu"
                  >
                    <span class="the-header__mobile-link-icon">✓</span><span><strong>Мои заказы</strong><small>Статусы и история</small></span><i>→</i>
                  </NuxtLink>

                  <NuxtLink
                      v-if="['admin','manager'].includes(auth_store.user?.role)"
                      to="/admin"
                      class="the-header__mobile-link"
                      @click="closeMobileMenu"
                  >
                    <span class="the-header__mobile-link-icon">⚙</span><span><strong>Админка</strong><small>Управление магазином</small></span><i>→</i>
                  </NuxtLink>
                </template>

                <template #fallback>
                  <span class="the-header__mobile-link the-header__mobile-link--muted"></span>
                </template>
              </ClientOnly>
            </nav>

            <nav class="the-header__mobile-secondary" aria-label="Информация">
              <NuxtLink to="/about" @click="closeMobileMenu">О магазине</NuxtLink>
              <NuxtLink to="/legal/delivery" @click="closeMobileMenu">Доставка</NuxtLink>
              <NuxtLink to="/faq" @click="closeMobileMenu">Помощь</NuxtLink>
              <NuxtLink to="/contacts" @click="closeMobileMenu">Контакты</NuxtLink>
            </nav>

            <div class="the-header__mobile-account">
              <ClientOnly>
                <template #default>
                  <template v-if="auth_store.is_authenticated">
                    <NuxtLink to="/account" class="the-header__mobile-account-link" @click="closeMobileMenu">
                      Личный кабинет
                    </NuxtLink>

                    <div class="the-header__mobile-user">
                      <span class="the-header__mobile-user-label">Вы вошли как</span>
                      <span class="the-header__mobile-user-email">{{ auth_store.user?.email }}</span>
                    </div>

                    <button
                        class="btn btn--secondary the-header__mobile-btn"
                        type="button"
                        @click="handleLogoutAndClose"
                    >
                      Выйти
                    </button>
                  </template>

                  <template v-else>
                    <div class="the-header__mobile-auth">
                      <NuxtLink
                          to="/login"
                          class="btn btn--secondary the-header__mobile-btn"
                          @click="closeMobileMenu"
                      >
                        Войти
                      </NuxtLink>

                      <NuxtLink
                          to="/register"
                          class="btn btn--primary the-header__mobile-btn"
                          @click="closeMobileMenu"
                      >
                        Регистрация
                      </NuxtLink>
                    </div>
                  </template>
                </template>

                <template #fallback>
                  <div class="the-header__actions-placeholder"></div>
                </template>
              </ClientOnly>
            </div>
          </div>
      </div>
    </transition>
  </header>
</template>

<script setup>
import {computed} from 'vue'
import './the-header.scss'
import {useTheHeader} from './useTheHeader'
import {useAuthStore} from '~/stores/auth'
import {useCartStore} from '~/stores/cart'

const auth_store = useAuthStore()
const cart_store = useCartStore()

const orders_link = computed(() => {
  return auth_store.is_authenticated ? '/account/orders' : '/orders'
})

const {
  is_mobile_menu_open,
  closeMobileMenu,
  toggleMobileMenu,
  handleLogout,
  handleLogoutAndClose
} = useTheHeader()
</script>

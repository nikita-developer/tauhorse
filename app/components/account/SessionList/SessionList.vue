<template>
  <div class="session-list card">
    <div class="session-list__header">
      <h2>Активные сессии</h2>
      <button class="btn btn--secondary" @click="logoutAll">Выйти везде</button>
    </div>

    <div class="session-list__items">
      <article v-for="item in auth_store.sessions" :key="item.id" class="session-list__item">
        <div>
          <strong>ID: {{ item.id }}</strong>
          <p>{{ item.user_agent || 'Неизвестное устройство' }}</p>
          <p>{{ item.ip_address || 'IP неизвестен' }}</p>
          <p>{{ item.created_at }}</p>
        </div>

        <button class="btn btn--secondary" @click="deleteSession(item.id)">Завершить</button>
      </article>
    </div>
  </div>
</template>

<script setup>
import './session-list.scss'
import { useSessionList } from './useSessionList'
import { useAuthStore } from '~/stores/auth'

const auth_store = useAuthStore()
const { logoutAll, deleteSession } = useSessionList()

await useAsyncData('sessions', () => auth_store.fetchSessions())
</script>

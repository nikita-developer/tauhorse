import {defineStore} from 'pinia'

let next_id = 1

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({items: []}),
  actions: {
    show(message, type = 'success', timeout = 3200) {
      const id = next_id++
      this.items.push({id, message, type})
      if (import.meta.client && timeout > 0) {
        window.setTimeout(() => this.dismiss(id), timeout)
      }
      return id
    },
    success(message) { return this.show(message, 'success') },
    error(message) { return this.show(message, 'error', 4800) },
    info(message) { return this.show(message, 'info') },
    dismiss(id) {
      this.items = this.items.filter(item => item.id !== id)
    }
  }
})

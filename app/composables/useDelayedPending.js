import {ref} from 'vue'

export const useDelayedPending = ({delay = 180, minimum = 260} = {}) => {
  const is_pending = ref(false)
  const is_visible = ref(false)
  let show_timer = null
  let shown_at = 0
  let cycle = 0

  const start = () => {
    cycle += 1
    clearTimeout(show_timer)
    is_pending.value = true
    is_visible.value = false
    show_timer = setTimeout(() => {
      shown_at = Date.now()
      is_visible.value = true
    }, delay)
  }

  const finish = async () => {
    const finishing_cycle = cycle
    is_pending.value = false
    clearTimeout(show_timer)
    if (is_visible.value) {
      const remaining = Math.max(0, minimum - (Date.now() - shown_at))
      if (remaining) await new Promise(resolve => setTimeout(resolve, remaining))
    }
    if (finishing_cycle === cycle) is_visible.value = false
  }

  return {is_pending, is_visible, start, finish}
}

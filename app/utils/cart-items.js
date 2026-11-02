// Порядок добавления товаров не зависит от изменения количества и цены.
// Сервер также сортирует CartItem по id; здесь страхуем повторные ответы API.
export const sortCartItems = items => Array.isArray(items)
  ? [...items].sort((left, right) => {
      const a = Number(left?.id)
      const b = Number(right?.id)
      if (Number.isFinite(a) && Number.isFinite(b)) return a - b
      return String(left?.id ?? '').localeCompare(String(right?.id ?? ''), 'ru', {numeric: true})
    })
  : []

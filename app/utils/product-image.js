// Главное фото товара может храниться как связанное ProductMedia или как старый image_url.
// Игнорируем видео и пустые адреса; используется в корзине и обеих карточках заказа.
export const getProductImage = product => {
  if (!product) return ''

  const first_image = Array.isArray(product.media)
    ? product.media.find(media => media?.media_type === 'image' && typeof media.url === 'string' && media.url.trim())
    : null

  return first_image?.url?.trim() || product.image || product.image_url ||
    product.preview_image || product.photo || ''
}

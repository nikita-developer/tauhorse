export default defineNuxtRouteMiddleware(async to=>{
  if(import.meta.server)return
  const auth=useAuthStore()
  if(!auth.is_initialized)await auth.initAuth()
  if(!auth.is_authenticated)return navigateTo('/login')
  const user=auth.user
  if(!user?.is_active||!['admin','manager'].includes(user?.role))return navigateTo('/')
  if(user.role==='admin')return
  const checks=[['/admin/orders','can_manage_orders'],['/admin/products','can_manage_catalog'],['/admin/categories','can_manage_catalog'],['/admin/discounts','can_manage_discounts'],['/admin/campaigns','can_manage_campaigns']]
  const match=checks.find(([path])=>to.path.startsWith(path))
  if(match&&!user[match[1]])return navigateTo('/admin')
  if(to.path.startsWith('/admin/team')||to.path.startsWith('/admin/audit'))return navigateTo('/admin')
})

export const staffPermissions=['can_manage_orders','can_manage_catalog','can_manage_discounts','can_manage_campaigns']
export const hasStaffPermission=(user,permission)=>{
  if(!user||user.is_active===false)return false
  if(user.role==='admin')return true
  return user.role==='manager'&&staffPermissions.includes(permission)&&user[permission]===true
}
export const isStaffUser=user=>Boolean(user&&user.is_active!==false&&['admin','manager'].includes(user.role))

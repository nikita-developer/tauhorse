import crypto from 'crypto'

export const generateGuestToken = () => crypto.randomBytes(32).toString('hex')

export const resolveGuestData = request => {
  if (request.user?.id) {
    return {
      user_id: request.user.id,
      guest_token: null,
      should_set_guest_cookie: false
    }
  }

  let guest_token = request.cookies?.guest_token
  let should_set_guest_cookie = false

  if (!guest_token) {
    guest_token = generateGuestToken()
    should_set_guest_cookie = true
  }

  return {
    user_id: null,
    guest_token,
    should_set_guest_cookie
  }
}

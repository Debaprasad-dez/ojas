// Profile lives only in this browser, like the chats. The photo is a small square data URL.
const KEY = 'ojas.profile.v1'
export const EMPTY_PROFILE = { name: '', email: '', photo: '' }
const PHOTO_PX = 128 // stored size: a camera photo becomes a few KB instead of megabytes
const MAX_UPLOAD_MB = 20

export function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY))
    if (!p || typeof p !== 'object') return EMPTY_PROFILE
    return {
      name: String(p.name ?? '').slice(0, 60),
      email: String(p.email ?? '').slice(0, 120),
      // only an image data URL we made ourselves is ever used as a background image
      photo: typeof p.photo === 'string' && p.photo.startsWith('data:image/') ? p.photo : '',
    }
  } catch {
    return EMPTY_PROFILE
  }
}

// throws if storage is full or blocked, so the caller can say so
export function saveProfile(profile) {
  localStorage.setItem(KEY, JSON.stringify(profile))
}

// Centre-crop to a square and scale down; webp where the browser can encode it, else png.
export async function toAvatar(file) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (PNG, JPG, WebP…).')
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`That image is over ${MAX_UPLOAD_MB} MB.`)
  let bmp
  try {
    bmp = await createImageBitmap(file)
  } catch {
    throw new Error('Couldn’t read that image. Try a PNG or JPG.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = PHOTO_PX
  const scale = Math.max(PHOTO_PX / bmp.width, PHOTO_PX / bmp.height)
  const w = bmp.width * scale
  const h = bmp.height * scale
  canvas.getContext('2d').drawImage(bmp, (PHOTO_PX - w) / 2, (PHOTO_PX - h) / 2, w, h)
  bmp.close?.()
  return canvas.toDataURL('image/webp', 0.85)
}

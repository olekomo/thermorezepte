export async function compressImage(input: File, maxDim = 2048, quality = 0.82): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(input)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = ev => {
      URL.revokeObjectURL(objectUrl)
      reject(ev)
    }
    image.src = objectUrl
  })

  const { width, height } = img
  const scale = Math.min(1, maxDim / Math.max(width, height))
  const targetW = Math.round(width * scale)
  const targetH = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas-Kontext nicht verfügbar.')
  ctx.drawImage(img, 0, 0, targetW, targetH)

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Bild konnte nicht komprimiert werden.'))),
      'image/jpeg',
      quality
    )
  )
}

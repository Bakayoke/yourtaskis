export async function shareDrawing(dataUrl: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], 'yourtaskis-teckning.png', { type: 'image/png' })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Your Task Is', text: title, files: [file] })
      return 'shared'
    }

    const link = document.createElement('a')
    link.href = dataUrl
    link.download = 'yourtaskis-teckning.png'
    link.click()
    return 'copied'
  } catch {
    return 'failed'
  }
}

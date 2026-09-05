import { useEffect, useRef, useState } from 'react'

type Props = {
  onChange: (dataUrl: string) => void
  disabled?: boolean
}

export function DrawCanvas({ onChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [color, setColor] = useState('#1a1020')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#faf6f0'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    onChange(canvas.toDataURL('image/png'))
  }, [onChange])

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    drawing.current = true
    const canvas = canvasRef.current!
    canvas.setPointerCapture(e.pointerId)
    const ctx = canvas.getContext('2d')!
    const { x, y } = pos(e)
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    onChange(canvas.toDataURL('image/png'))
  }

  function end(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    drawing.current = false
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas || disabled) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#faf6f0'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    onChange(canvas.toDataURL('image/png'))
  }

  return (
    <div className="draw-wrap">
      <div className="draw-tools">
        {['#1a1020', '#e63946', '#457b9d', '#2a9d8f', '#e9c46a'].map((c) => (
          <button
            key={c}
            type="button"
            className={`color-dot${color === c ? ' active' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            disabled={disabled}
            aria-label={`Färg ${c}`}
          />
        ))}
        <button type="button" className="btn ghost small" onClick={clear} disabled={disabled}>
          Rensa
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="draw-canvas"
        width={800}
        height={500}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
    </div>
  )
}

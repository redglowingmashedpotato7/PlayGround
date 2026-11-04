/* Tiny procedural status portrait: a plumbob with feelings. */

export function drawFace(ctx, { health = 100, armor = 0, weapon = 'shotgun', hurt = false, time = 0 } = {}) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const cx = w / 2
  const cy = h / 2

  ctx.clearRect(0, 0, w, h)

  // Dark viewport with faint scanning lines.
  ctx.fillStyle = '#0a0c0a'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(184,255,61,.035)'
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1)

  if (hurt) {
    const flash = ctx.createRadialGradient(cx, cy, 4, cx, cy, w * 0.65)
    flash.addColorStop(0, 'rgba(220,30,30,.55)')
    flash.addColorStop(1, 'rgba(220,30,30,0)')
    ctx.fillStyle = flash
    ctx.fillRect(0, 0, w, h)
  }

  const ratio = Math.max(0, Math.min(1, health / 100))
  const body = ratio > 0.6 ? '#b8ff3d' : ratio > 0.3 ? '#ffb340' : '#ff4a3a'
  const bodyDark = ratio > 0.6 ? '#4d8a16' : ratio > 0.3 ? '#8a5510' : '#8a140e'

  // Plumbob head.
  ctx.save()
  ctx.translate(cx, cy + 2)
  const bob = Math.sin(time * 2.4) * 0.6
  ctx.translate(0, bob)
  const g = ctx.createLinearGradient(-20, -28, 18, 30)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.18, body)
  g.addColorStop(1, bodyDark)
  ctx.beginPath()
  ctx.moveTo(0, -30)
  ctx.lineTo(22, -7)
  ctx.lineTo(0, 31)
  ctx.lineTo(-22, -7)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = 'rgba(4,8,4,.75)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Inner facet highlight.
  ctx.beginPath()
  ctx.moveTo(0, -25)
  ctx.lineTo(14, -7)
  ctx.lineTo(0, -1)
  ctx.lineTo(-14, -7)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,.16)'
  ctx.fill()

  // Eyes.
  const blink = Math.sin(time * 0.9) > 0.985
  if (blink) {
    ctx.fillStyle = 'rgba(10,16,8,.8)'
    ctx.fillRect(-12, -5, 8, 2)
    ctx.fillRect(4, -5, 8, 2)
  } else {
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#f7f3dc'
      ctx.fillRect(s * 8 - 4, -8, 8, 8)
      ctx.fillStyle = '#10160c'
      ctx.fillRect(s * 8 - 1.5, -6, 3, 5)
      ctx.fillStyle = 'rgba(255,255,255,.85)'
      ctx.fillRect(s * 8 - 3, -7, 2, 2)
    }
  }

  // Brows.
  ctx.strokeStyle = 'rgba(12,20,8,.7)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-13, -12)
  ctx.lineTo(-4, ratio > 0.35 ? -12 : -10)
  ctx.moveTo(13, -12)
  ctx.lineTo(4, ratio > 0.35 ? -12 : -10)
  ctx.stroke()

  // Mouth: a grin when healthy, a grimace when nearly dead.
  ctx.strokeStyle = 'rgba(12,20,8,.85)'
  ctx.lineWidth = 2
  ctx.beginPath()
  if (ratio > 0.35) {
    ctx.arc(0, 5, 9, 0.18 * Math.PI, 0.82 * Math.PI)
  } else {
    ctx.arc(0, 16, 8, 1.2 * Math.PI, 1.8 * Math.PI)
  }
  ctx.stroke()

  if (weapon === 'pistol') {
    ctx.fillStyle = 'rgba(255,209,102,.85)'
    ctx.fillRect(-3, 17, 6, 2)
  }
  ctx.restore()

  // Armor brackets.
  if (armor > 0) {
    ctx.strokeStyle = `rgba(87,230,255,${0.45 + Math.min(0.5, armor / 100)})`
    ctx.lineWidth = 2
    const m = 5
    ctx.beginPath()
    ctx.moveTo(m, m + 8); ctx.lineTo(m, m); ctx.lineTo(m + 8, m)
    ctx.moveTo(w - m, m + 8); ctx.lineTo(w - m, m); ctx.lineTo(w - m - 8, m)
    ctx.moveTo(m, h - m - 8); ctx.lineTo(m, h - m); ctx.lineTo(m + 8, h - m)
    ctx.moveTo(w - m, h - m - 8); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m - 8, h - m)
    ctx.stroke()
  }

  // Heart-rate tick.
  const t = (time * 1.3) % 1
  ctx.strokeStyle = ratio > 0.3 ? 'rgba(184,255,61,.55)' : 'rgba(255,74,58,.8)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x < w; x += 2) {
    const p = x / w
    const y = h - 7 - (Math.abs(p - 0.5) < 0.04 ? Math.sin((p - 0.46) * 80) * 5 : 0)
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.globalAlpha = 0.5
  ctx.stroke()
  ctx.globalAlpha = 1
  const px = Math.floor(t * w)
  ctx.fillStyle = 'rgba(184,255,61,.55)'
  ctx.fillRect(px, h - 10, 1, 7)
}

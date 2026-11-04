import * as THREE from 'three'

const cache = new Map()

function rng(seed = 1) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return [c, c.getContext('2d')]
}

function finish(c, { repeat = [1, 1], srgb = true, nearest = false } = {}) {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter
  t.needsUpdate = true
  return t
}

function grain(ctx, w, h, amount, alpha, rand) {
  for (let i = 0; i < amount; i++) {
    const x = rand() * w, y = rand() * h, s = rand() * 2 + 0.4
    const v = rand() > 0.5 ? 255 : 0
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rand()})`
    ctx.fillRect(x, y, s, s)
  }
}

function cracks(ctx, w, h, rand, color = 'rgba(36,28,22,.35)', count = 8) {
  ctx.strokeStyle = color
  for (let i = 0; i < count; i++) {
    ctx.lineWidth = 0.5 + rand()
    ctx.beginPath()
    let x = rand() * w, y = rand() * h
    ctx.moveTo(x, y)
    for (let s = 0; s < 5; s++) {
      x += (rand() - 0.5) * 30; y += (rand() - 0.5) * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

function stains(ctx, w, h, rand, color = 'rgba(42,30,18,.18)', count = 7) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w, y = rand() * h, r = 8 + rand() * 42
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
}

function bloodDrip(ctx, w, h, rand, count = 3) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w, y = rand() * h * 0.5
    ctx.strokeStyle = `rgba(${82 + rand() * 40},${6 + rand() * 8},${8 + rand() * 8},${0.5 + rand() * 0.3})`
    ctx.lineWidth = 1 + rand() * 2.5
    ctx.beginPath(); ctx.moveTo(x, y)
    ctx.bezierCurveTo(x + 2, y + 22, x - 3, y + 45, x + 1, y + 55 + rand() * 80)
    ctx.stroke()
    ctx.beginPath(); ctx.arc(x, y, 2 + rand() * 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(90,8,10,.6)'; ctx.fill()
  }
}

/* ------------------------------------------------------------------ */
/* Neighborhood                                                        */
/* ------------------------------------------------------------------ */

export function grassTexture() {
  if (cache.has('grass')) return cache.get('grass')
  const [c, ctx] = canvas(256, 256)
  const rand = rng(8)
  ctx.fillStyle = '#6a9a3f'; ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 900; i++) {
    const x = rand() * 256, y = rand() * 256, l = 2 + rand() * 6
    const g = 120 + rand() * 65
    ctx.strokeStyle = `rgba(${40 + rand() * 30},${g},${35 + rand() * 25},${0.18 + rand() * 0.3})`
    ctx.lineWidth = 0.7
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - .5) * 2, y - l); ctx.stroke()
  }
  grain(ctx, 256, 256, 2600, 0.05, rand)
  const t = finish(c, { repeat: [26, 26] })
  cache.set('grass', t); return t
}

export function roadTexture() {
  if (cache.has('road')) return cache.get('road')
  const [c, ctx] = canvas(256, 256)
  const rand = rng(21)
  ctx.fillStyle = '#3a3b38'; ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 6000; i++) {
    const v = 30 + rand() * 60
    ctx.fillStyle = `rgba(${v},${v},${v - 2},${0.12 + rand() * 0.3})`
    ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 1 + rand() * 2)
  }
  cracks(ctx, 256, 256, rand, 'rgba(15,15,14,.4)', 6)
  const t = finish(c, { repeat: [18, 18] })
  cache.set('road', t); return t
}

export function concreteTexture() {
  if (cache.has('concrete')) return cache.get('concrete')
  const [c, ctx] = canvas(128, 128)
  const rand = rng(33)
  ctx.fillStyle = '#b9b3a4'; ctx.fillRect(0, 0, 128, 128)
  grain(ctx, 128, 128, 2200, 0.1, rand)
  ctx.strokeStyle = 'rgba(60,56,48,.25)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(128, 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(2, 128); ctx.stroke()
  const t = finish(c, { repeat: [8, 8] })
  cache.set('concrete', t); return t
}

export function sidingTexture(color = '#ded7bf') {
  const key = 'siding' + color
  if (cache.has(key)) return cache.get(key)
  const [c, ctx] = canvas(128, 128)
  const rand = rng(44)
  ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128)
  for (let y = 0; y < 128; y += 10) {
    ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(0, y + 8, 128, 2)
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(0, y, 128, 1)
  }
  grain(ctx, 128, 128, 500, 0.04, rand)
  const t = finish(c, { repeat: [3, 2] })
  cache.set(key, t); return t
}

export function shingleTexture(color = '#6d4b3d') {
  const key = 'shingle' + color
  if (cache.has(key)) return cache.get(key)
  const [c, ctx] = canvas(128, 128)
  const rand = rng(51)
  ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128)
  for (let y = 0; y < 128; y += 12) {
    for (let x = -8; x < 128; x += 20) {
      const ox = (Math.floor(y / 12) % 2) * 10
      ctx.fillStyle = `rgba(0,0,0,${0.09 + rand() * 0.12})`
      ctx.fillRect(x + ox, y, 18, 11)
      ctx.fillStyle = 'rgba(255,255,255,.07)'
      ctx.fillRect(x + ox, y, 18, 1)
    }
  }
  grain(ctx, 128, 128, 900, 0.06, rand)
  const t = finish(c, { repeat: [4, 2] })
  cache.set(key, t); return t
}

/* ------------------------------------------------------------------ */
/* Interiors                                                           */
/* ------------------------------------------------------------------ */

const WALLS = {
  verdant: { base: '#cfcdb2', motif: '#7d8c67', accent: '#5a6549', dark: '#4a4c39' },
  crimson: { base: '#4b1719', motif: '#7c2f27', accent: '#2a0a0b', dark: '#240708' },
  toxic: { base: '#1d3a34', motif: '#3e7461', accent: '#7ac5a3', dark: '#0d211e' },
  marble: { base: '#191a1f', motif: '#2e3038', accent: '#b49f70', dark: '#0b0c0f' },
}

export function wallpaper(theme = 'verdant', variant = 0) {
  const key = `wall-${theme}-${variant}`
  if (cache.has(key)) return cache.get(key)
  const p = WALLS[theme] || WALLS.verdant
  const [c, ctx] = canvas(256, 256)
  const rand = rng(100 + variant * 17)
  ctx.fillStyle = p.base; ctx.fillRect(0, 0, 256, 256)

  if (variant === 0) {
    // damask-ish vertical stripes and diamonds
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(x, 0, 14, 256)
      ctx.fillStyle = p.motif; ctx.globalAlpha = theme === 'crimson' ? 0.35 : 0.22
      ctx.fillRect(x + 22, 0, 2, 256)
      ctx.globalAlpha = 1
    }
    ctx.globalAlpha = theme === 'crimson' ? 0.4 : 0.3
    ctx.strokeStyle = p.motif; ctx.lineWidth = 1.2
    for (let y = 20; y < 256; y += 64) {
      for (let x = 16; x < 256; x += 64) {
        ctx.beginPath()
        ctx.moveTo(x, y - 13); ctx.lineTo(x + 15, y); ctx.lineTo(x, y + 13); ctx.lineTo(x - 15, y); ctx.closePath()
        ctx.stroke()
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = p.motif; ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  } else if (variant === 1) {
    // tech panel / wainscot
    ctx.fillStyle = p.dark; ctx.fillRect(0, 0, 256, 92)
    ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(0, 8, 256, 2); ctx.fillRect(0, 80, 256, 2)
    for (let x = 10; x < 256; x += 54) {
      ctx.fillStyle = p.motif; ctx.globalAlpha = .28; ctx.fillRect(x, 20, 34, 44); ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.strokeRect(x, 20, 34, 44)
    }
    // lower wallpaper
    ctx.save(); ctx.translate(0, 92); ctx.scale(1, .65)
    for (let x = 0; x < 256; x += 26) { ctx.fillStyle = 'rgba(255,255,255,.025)'; ctx.fillRect(x, 0, 12, 256) }
    ctx.restore()
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, 92, 256, 5)
  } else {
    // 70s geometric rec-room
    ctx.fillStyle = p.dark; ctx.fillRect(0, 0, 256, 256)
    for (let y = 0; y < 256; y += 64) {
      for (let x = 0; x < 256; x += 64) {
        const ox = (Math.floor(y / 64) % 2) * 32
        ctx.fillStyle = p.motif; ctx.globalAlpha = .35
        ctx.beginPath(); ctx.moveTo(x + ox, y); ctx.lineTo(x + ox + 28, y + 28); ctx.lineTo(x + ox, y + 56); ctx.lineTo(x + ox - 28, y + 28); ctx.closePath(); ctx.fill()
        ctx.globalAlpha = 1
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2
    for (let x = 0; x < 256; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke() }
  }

  stains(ctx, 256, 256, rand, theme === 'crimson' ? 'rgba(15,4,3,.3)' : 'rgba(38,28,16,.16)', 9)
  cracks(ctx, 256, 256, rand, theme === 'crimson' ? 'rgba(10,2,2,.4)' : 'rgba(40,32,20,.2)', 5)
  bloodDrip(ctx, 256, 256, rand, theme === 'crimson' ? 5 : 2)
  grain(ctx, 256, 256, 1300, 0.05, rand)

  // torn patches revealing lath
  if (variant !== 0) {
    for (let i = 0; i < 2; i++) {
      const x = 20 + rand() * 190, y = 30 + rand() * 120
      ctx.fillStyle = 'rgba(24,18,12,.65)'
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18 + rand() * 20, y + 4); ctx.lineTo(x + 10, y + 24 + rand() * 20); ctx.lineTo(x - 6, y + 12); ctx.closePath(); ctx.fill()
    }
  }
  const t = finish(c, { repeat: [1, 1] })
  cache.set(key, t); return t
}

export function floorTexture(kind = 'wood') {
  const key = 'floor-' + kind
  if (cache.has(key)) return cache.get(key)
  const [c, ctx] = canvas(256, 256)
  const rand = rng(201)

  if (kind === 'wood') {
    ctx.fillStyle = '#6a4327'; ctx.fillRect(0, 0, 256, 256)
    for (let y = 0; y < 256; y += 32) {
      const off = (Math.floor(y / 32) % 2) * 64
      for (let x = -64; x < 256; x += 128) {
        const shade = 0.78 + rand() * 0.45
        ctx.fillStyle = `rgb(${90 * shade},${58 * shade},${31 * shade})`
        ctx.fillRect(x + off + 1, y + 1, 126, 30)
        ctx.strokeStyle = 'rgba(30,18,10,.4)'; ctx.lineWidth = 1
        ctx.strokeRect(x + off + .5, y + .5, 127, 31)
        for (let i = 0; i < 14; i++) {
          ctx.strokeStyle = `rgba(35,20,10,${.05 + rand() * .14})`; ctx.lineWidth = .6
          const gx = x + off + rand() * 126
          ctx.beginPath(); ctx.moveTo(gx, y + 2); ctx.bezierCurveTo(gx + 3, y + 10, gx - 3, y + 20, gx + 1, y + 30); ctx.stroke()
        }
      }
    }
  } else if (kind === 'checker') {
    for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) {
      const even = ((x / 64) + (y / 64)) % 2 === 0
      ctx.fillStyle = even ? '#ded7bd' : '#4f6046'
      ctx.fillRect(x, y, 64, 64)
      ctx.strokeStyle = 'rgba(20,24,18,.2)'; ctx.strokeRect(x, y, 64, 64)
      for (let i = 0; i < 5; i++) { ctx.fillStyle = `rgba(30,30,25,${rand() * .06})`; ctx.fillRect(x + rand() * 64, y + rand() * 64, 1 + rand() * 3, 1 + rand() * 3) }
    }
  } else if (kind === 'carpet') {
    ctx.fillStyle = '#5f4b3d'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 9000; i++) {
      const v = 45 + rand() * 45
      ctx.fillStyle = `rgba(${v + 20},${v},${v - 8},${.15 + rand() * .25})`
      ctx.fillRect(rand() * 256, rand() * 256, 1.5, 1.5)
    }
    ctx.strokeStyle = 'rgba(30,22,16,.18)'; ctx.lineWidth = 1
    for (let x = 0; x < 256; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke() }
  } else if (kind === 'marble') {
    ctx.fillStyle = '#d9d2bc'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = `rgba(${100 + rand() * 40},${95 + rand() * 40},${80 + rand() * 40},${.1 + rand() * .22})`
      ctx.lineWidth = .5 + rand() * 2
      ctx.beginPath(); let x = rand() * 256, y = rand() * 256; ctx.moveTo(x, y)
      for (let s = 0; s < 7; s++) { x += (rand() - .5) * 60; y += (rand() - .5) * 60; ctx.lineTo(x, y) }
      ctx.stroke()
    }
    stains(ctx, 256, 256, rand, 'rgba(70,60,45,.08)', 6)
    cracks(ctx, 256, 256, rand, 'rgba(50,40,30,.18)', 4)
  } else if (kind === 'hellstone') {
    ctx.fillStyle = '#221a19'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 220; i++) {
      const v = 20 + rand() * 35
      ctx.fillStyle = `rgba(${v + 8},${v},${v - 2},${.3 + rand() * .4})`
      ctx.fillRect(rand() * 256, rand() * 256, 4 + rand() * 16, 3 + rand() * 10)
    }
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `rgba(${150 + rand() * 90},${20 + rand() * 30},${5 + rand() * 15},${.35 + rand() * .4})`
      ctx.lineWidth = 1 + rand() * 2
      ctx.beginPath(); let x = rand() * 256, y = rand() * 256; ctx.moveTo(x, y)
      for (let s = 0; s < 4; s++) { x += (rand() - .5) * 55; y += (rand() - .5) * 55; ctx.lineTo(x, y) }
      ctx.stroke()
    }
  } else if (kind === 'tile') {
    ctx.fillStyle = '#97a594'; ctx.fillRect(0, 0, 256, 256)
    for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = `rgba(${150 + rand() * 30},${170 + rand() * 25},${150 + rand() * 20},1)`
      ctx.fillRect(x + 1, y + 1, 30, 30)
      ctx.fillStyle = 'rgba(30,50,35,.15)'; ctx.fillRect(x + 1, y + 28, 30, 3)
    }
    stains(ctx, 256, 256, rand, 'rgba(26,48,30,.16)', 8)
  } else if (kind === 'slime') {
    ctx.fillStyle = '#3d6b1c'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 24; i++) {
      const x = rand() * 256, y = rand() * 256, r = 6 + rand() * 26
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(150,255,80,.5)'); g.addColorStop(1, 'rgba(40,110,10,0)')
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
  } else {
    ctx.fillStyle = '#7b7069'; ctx.fillRect(0, 0, 256, 256)
    grain(ctx, 256, 256, 5000, 0.08, rand)
  }
  const t = finish(c, { repeat: [5, 5] })
  cache.set(key, t); return t
}

export function ceilingTexture() {
  if (cache.has('ceiling')) return cache.get('ceiling')
  const [c, ctx] = canvas(256, 256)
  const rand = rng(302)
  ctx.fillStyle = '#8c8778'; ctx.fillRect(0, 0, 256, 256)
  grain(ctx, 256, 256, 3000, 0.07, rand)
  stains(ctx, 256, 256, rand, 'rgba(60,42,20,.12)', 10)
  cracks(ctx, 256, 256, rand, 'rgba(50,45,35,.2)', 3)
  const t = finish(c, { repeat: [8, 8] })
  cache.set('ceiling', t); return t
}

export function brickTexture(theme = 'crimson') {
  const key = 'brick-' + theme
  if (cache.has(key)) return cache.get(key)
  const [c, ctx] = canvas(256, 256)
  const rand = rng(411)
  ctx.fillStyle = theme === 'crimson' ? '#3d1512' : '#4f483f'; ctx.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 256; y += 26) {
    for (let x = -20; x < 256; x += 52) {
      const ox = (Math.floor(y / 26) % 2) * 26
      const v = rand()
      ctx.fillStyle = theme === 'crimson'
        ? `rgb(${76 + v * 35},${28 + v * 18},${24 + v * 14})`
        : `rgb(${70 + v * 30},${64 + v * 28},${55 + v * 22})`
      ctx.fillRect(x + ox + 1, y + 1, 50, 24)
      ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x + ox + 1, y + 1, 50, 1)
    }
  }
  stains(ctx, 256, 256, rand, 'rgba(10,5,3,.2)', 7)
  bloodDrip(ctx, 256, 256, rand, 3)
  const t = finish(c, { repeat: [3, 2] })
  cache.set(key, t); return t
}

export function metalTexture(color = '#6c716f') {
  const key = 'metal-' + color
  if (cache.has(key)) return cache.get(key)
  const [c, ctx] = canvas(128, 128)
  const rand = rng(512)
  ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128)
  for (let y = 0; y < 128; y += 16) { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, y, 128, 2) }
  grain(ctx, 128, 128, 900, 0.08, rand)
  stains(ctx, 128, 128, rand, 'rgba(40,22,8,.16)', 4)
  const t = finish(c, { repeat: [2, 2] })
  cache.set(key, t); return t
}

export function rugTexture(kind = 'persian') {
  const key = 'rug-' + kind
  if (cache.has(key)) return cache.get(key)
  const [c, ctx] = canvas(256, 160)
  const rand = rng(611)
  if (kind === 'persian') {
    ctx.fillStyle = '#6d1d1f'; ctx.fillRect(0, 0, 256, 160)
    ctx.strokeStyle = '#c39a4d'; ctx.lineWidth = 5; ctx.strokeRect(6, 6, 244, 148)
    ctx.strokeStyle = '#2c1a2e'; ctx.lineWidth = 2; ctx.strokeRect(14, 14, 228, 132)
    for (let y = 30; y < 140; y += 26) for (let x = 30; x < 240; x += 30) {
      ctx.fillStyle = (x / 30 + y / 26) % 2 ? '#2c1a2e' : '#b07935'
      ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y); ctx.fill()
    }
  } else if (kind === 'sacred') {
    ctx.fillStyle = '#34161a'; ctx.fillRect(0, 0, 256, 160)
    ctx.strokeStyle = '#a51b1b'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(128, 80, 58, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(128, 80, 40, 0, Math.PI * 2); ctx.stroke()
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5
      const a2 = a + Math.PI * 4 / 5
      ctx.beginPath(); ctx.moveTo(128 + Math.cos(a) * 55, 80 + Math.sin(a) * 55); ctx.lineTo(128 + Math.cos(a2) * 55, 80 + Math.sin(a2) * 55); ctx.stroke()
    }
  } else {
    ctx.fillStyle = '#1a3a44'; ctx.fillRect(0, 0, 256, 160)
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(${40 + rand() * 80},${130 + rand() * 90},${120 + rand() * 80},${.1 + rand() * .2})`
      ctx.fillRect(rand() * 256, rand() * 160, 2 + rand() * 12, 1 + rand() * 3)
    }
    ctx.strokeStyle = 'rgba(100,240,200,.25)'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, 236, 140)
  }
  const t = finish(c, { repeat: [1, 1] })
  cache.set(key, t); return t
}

/* ------------------------------------------------------------------ */
/* Decals, sprites, paintings                                          */
/* ------------------------------------------------------------------ */

export function glowTexture() {
  if (cache.has('glow')) return cache.get('glow')
  const [c, ctx] = canvas(128, 128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(.22, 'rgba(255,255,255,.8)')
  g.addColorStop(.55, 'rgba(255,255,255,.22)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128)
  const t = finish(c, { srgb: false })
  cache.set('glow', t); return t
}

export function smokeTexture() {
  if (cache.has('smoke')) return cache.get('smoke')
  const [c, ctx] = canvas(128, 128)
  const rand = rng(707)
  for (let i = 0; i < 30; i++) {
    const x = 30 + rand() * 68, y = 30 + rand() * 68, r = 8 + rand() * 26
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${.06 + rand() * .08})`); g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128)
  }
  const t = finish(c, { srgb: false })
  cache.set('smoke', t); return t
}

export function cloudTexture() {
  if (cache.has('cloud')) return cache.get('cloud')
  const [c, ctx] = canvas(256, 128)
  const rand = rng(808)
  for (let i = 0; i < 18; i++) {
    const x = 40 + rand() * 176, y = 40 + rand() * 48, r = 18 + rand() * 34
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(.55, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 128)
  }
  const t = finish(c, { srgb: false })
  cache.set('cloud', t); return t
}

export function bloodTexture() {
  if (cache.has('blood')) return cache.get('blood')
  const [c, ctx] = canvas(128, 128)
  const rand = rng(901)
  ctx.translate(64, 64)
  for (let i = 0; i < 18; i++) {
    const a = rand() * Math.PI * 2, d = rand() * 46, r = 3 + rand() * 18
    ctx.fillStyle = `rgba(${70 + rand() * 45},${4 + rand() * 8},${6 + rand() * 8},${.5 + rand() * .4})`
    ctx.beginPath(); ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, r, r * (.5 + rand() * .7), a, 0, Math.PI * 2); ctx.fill()
  }
  const t = finish(c, { srgb: false })
  cache.set('blood', t); return t
}

export function bulletTexture() {
  if (cache.has('bullet')) return cache.get('bullet')
  const [c, ctx] = canvas(64, 64)
  const rand = rng(902)
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 26)
  g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.35, 'rgba(20,14,10,.75)'); g.addColorStop(1, 'rgba(30,20,12,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = `rgba(12,8,5,${.3 + rand() * .3})`; ctx.lineWidth = 1
    const a = rand() * Math.PI * 2, l = 8 + rand() * 16
    ctx.beginPath(); ctx.moveTo(32, 32); ctx.lineTo(32 + Math.cos(a) * l, 32 + Math.sin(a) * l); ctx.stroke()
  }
  const t = finish(c, { srgb: false })
  cache.set('bullet', t); return t
}

export function flameTexture() {
  if (cache.has('flame')) return cache.get('flame')
  const [c, ctx] = canvas(64, 128)
  const g = ctx.createRadialGradient(32, 92, 2, 32, 75, 52)
  g.addColorStop(0, 'rgba(255,255,220,1)')
  g.addColorStop(.25, 'rgba(255,214,90,.95)')
  g.addColorStop(.55, 'rgba(255,98,18,.7)')
  g.addColorStop(1, 'rgba(160,20,0,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.moveTo(32, 2); ctx.bezierCurveTo(58, 48, 54, 96, 32, 126); ctx.bezierCurveTo(10, 96, 6, 48, 32, 2); ctx.fill()
  const t = finish(c, { srgb: false })
  cache.set('flame', t); return t
}

export function paintingTexture(index = 0) {
  const key = 'painting-' + index
  if (cache.has(key)) return cache.get(key)
  const [c, ctx] = canvas(256, 192)
  const rand = rng(1000 + index * 31)
  const palettes = [
    ['#263746', '#8a6e45', '#c9b07a', '#4a2117'],
    ['#2b120f', '#7a1a16', '#d0432a', '#e8b46a'],
    ['#162b24', '#376b4f', '#a6d8a4', '#d8e8c0'],
    ['#10131c', '#39304a', '#9c6b8f', '#e2c6a8'],
    ['#332411', '#74501e', '#c9933f', '#f0d9a0'],
  ]
  const pal = palettes[index % palettes.length]
  ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, 256, 192)
  if (index % 5 === 0) {
    // family portrait silhouettes
    ctx.fillStyle = pal[1]; ctx.fillRect(0, 128, 256, 64)
    const heads = [[70, 80, 26], [128, 68, 30], [186, 84, 24]]
    for (const [x, y, r] of heads) {
      ctx.fillStyle = index % 2 === 0 ? '#c9a07a' : '#a87b5b'
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = pal[3]
      ctx.beginPath(); ctx.moveTo(x - r * 1.4, y + r * 3.4); ctx.quadraticCurveTo(x, y + r * .9, x + r * 1.4, y + r * 3.4); ctx.fill()
      ctx.fillStyle = '#17110e'
      ctx.fillRect(x - 8, y - 3, 4, 3); ctx.fillRect(x + 4, y - 3, 4, 3)
      ctx.strokeStyle = '#5a1517'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + 10, 6, .1, Math.PI - .1); ctx.stroke()
    }
    // one face scratched out
    ctx.strokeStyle = 'rgba(120,10,14,.8)'; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(112, 54); ctx.lineTo(144, 88); ctx.moveTo(144, 54); ctx.lineTo(112, 88); ctx.stroke()
  } else if (index % 5 === 1) {
    // hellscape
    ctx.fillStyle = pal[1]; ctx.beginPath(); ctx.moveTo(0, 160); ctx.lineTo(40, 92); ctx.lineTo(76, 140); ctx.lineTo(118, 70); ctx.lineTo(170, 136); ctx.lineTo(214, 80); ctx.lineTo(256, 150); ctx.lineTo(256, 192); ctx.lineTo(0, 192); ctx.fill()
    ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.arc(190, 44, 22, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = pal[3]; ctx.lineWidth = 2
    for (let i = 0; i < 30; i++) { ctx.beginPath(); ctx.arc(rand() * 256, 70 + rand() * 90, 2 + rand() * 8, 0, Math.PI * 2); ctx.stroke() }
  } else if (index % 5 === 2) {
    // suburban landscape
    ctx.fillStyle = pal[1]; ctx.fillRect(0, 120, 256, 72)
    ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.moveTo(0, 120); ctx.quadraticCurveTo(70, 70, 130, 118); ctx.quadraticCurveTo(190, 76, 256, 118); ctx.fill()
    ctx.fillStyle = pal[3]; ctx.beginPath(); ctx.arc(210, 46, 18, 0, Math.PI * 2); ctx.fill()
    for (let i = 0; i < 6; i++) { const x = 20 + i * 40; ctx.fillStyle = 'rgba(20,30,20,.5)'; ctx.fillRect(x, 112 + rand() * 20, 18, 30) }
  } else if (index % 5 === 3) {
    // abstract
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = pal[1 + (i % 3)]; ctx.globalAlpha = .6
      ctx.beginPath(); ctx.arc(rand() * 256, rand() * 192, 14 + rand() * 46, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
  } else {
    // neon open house
    ctx.fillStyle = '#0c0e14'; ctx.fillRect(0, 0, 256, 192)
    ctx.strokeStyle = '#ff5a24'; ctx.lineWidth = 4; ctx.shadowColor = '#ff5a24'; ctx.shadowBlur = 18
    ctx.strokeRect(36, 30, 184, 132)
    ctx.fillStyle = '#b8ff3d'; ctx.font = 'bold 32px Impact, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('OPEN', 128, 96); ctx.fillText('HOUSE', 128, 134)
    ctx.shadowBlur = 0
  }
  // frame + grime
  ctx.strokeStyle = '#241a10'; ctx.lineWidth = 12; ctx.strokeRect(0, 0, 256, 192)
  ctx.strokeStyle = 'rgba(220,190,120,.4)'; ctx.lineWidth = 3; ctx.strokeRect(9, 9, 238, 174)
  stains(ctx, 256, 192, rand, 'rgba(20,12,4,.16)', 4)
  const t = finish(c, { repeat: [1, 1] })
  cache.set(key, t); return t
}

export function windowTexture(theme = 'verdant') {
  const key = 'window-' + theme
  if (cache.has(key)) return cache.get(key)
  const [c, ctx] = canvas(128, 128)
  const rand = rng(1212)
  const colors = {
    verdant: ['#0e1b2d', '#4d7b8c', '#b8e7d0', '#253b40'],
    crimson: ['#1a0303', '#7c1408', '#ff6a1f', '#2a0604'],
    toxic: ['#07140e', '#2b7c4d', '#9dff7a', '#173d2a'],
    marble: ['#05060a', '#273050', '#b9d8ff', '#0b0f1a'],
  }[theme] || ['#0e1b2d', '#4d7b8c', '#b8e7d0', '#253b40']
  ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, 128, 128)
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, colors[1]); g.addColorStop(1, colors[0])
  ctx.fillStyle = g; ctx.fillRect(8, 8, 112, 112)
  if (theme === 'crimson') {
    ctx.fillStyle = colors[2]; ctx.beginPath(); ctx.arc(88, 40, 18, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#200604'; ctx.beginPath(); ctx.moveTo(0, 120); ctx.lineTo(30, 70); ctx.lineTo(64, 112); ctx.lineTo(90, 78); ctx.lineTo(128, 120); ctx.fill()
  } else if (theme === 'toxic') {
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(120,255,120,${.1 + rand() * .2})`; ctx.fillRect(rand() * 128, rand() * 128, 2, 2 + rand() * 12) }
  } else if (theme === 'marble') {
    ctx.fillStyle = '#dbe8ff'; ctx.beginPath(); ctx.arc(96, 32, 13, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#060810'; ctx.beginPath(); ctx.moveTo(0, 128); ctx.lineTo(0, 92); ctx.lineTo(38, 70); ctx.lineTo(72, 104); ctx.lineTo(110, 76); ctx.lineTo(128, 96); ctx.lineTo(128, 128); ctx.fill()
  } else {
    // sunny backyard
    ctx.fillStyle = '#78a86b'; ctx.fillRect(8, 88, 112, 32)
    ctx.fillStyle = '#dff4ff'; ctx.beginPath(); ctx.arc(96, 34, 14, 0, Math.PI * 2); ctx.fill()
    for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(30,60,30,.5)'; ctx.beginPath(); ctx.arc(24 + i * 30, 86, 12, 0, Math.PI * 2); ctx.fill() }
  }
  ctx.strokeStyle = 'rgba(235,225,195,.55)'; ctx.lineWidth = 5
  ctx.strokeRect(6, 6, 116, 116)
  ctx.beginPath(); ctx.moveTo(64, 6); ctx.lineTo(64, 122); ctx.moveTo(6, 64); ctx.lineTo(122, 64); ctx.stroke()
  ctx.strokeStyle = 'rgba(20,10,5,.45)'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 124, 124)
  bloodDrip(ctx, 128, 128, rand, 2)
  const t = finish(c, { repeat: [1, 1] })
  cache.set(key, t); return t
}

export function tvStaticTexture() {
  if (cache.has('tvstatic')) return cache.get('tvstatic')
  const [c, ctx] = canvas(128, 96)
  const rand = rng(1414)
  ctx.fillStyle = '#0a1a16'; ctx.fillRect(0, 0, 128, 96)
  for (let i = 0; i < 5000; i++) {
    const v = 60 + rand() * 190
    ctx.fillStyle = `rgba(${v * .4},${v},${v * .82},${.15 + rand() * .4})`
    ctx.fillRect(rand() * 128, rand() * 96, 1.5, 1)
  }
  for (let y = 0; y < 96; y += 5) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, y, 128, 1) }
  const t = finish(c, { repeat: [1, 1] })
  cache.set('tvstatic', t); return t
}

export function signTexture(lines, opts = {}) {
  const key = 'sign-' + lines.join('|') + JSON.stringify(opts)
  if (cache.has(key)) return cache.get(key)
  const w = opts.w || 512, h = opts.h || 256
  const [c, ctx] = canvas(w, h)
  ctx.fillStyle = opts.bg || '#18321f'; ctx.fillRect(0, 0, w, h)
  if (opts.border !== false) {
    ctx.strokeStyle = opts.borderColor || '#e6dcbe'; ctx.lineWidth = 10; ctx.strokeRect(10, 10, w - 20, h - 20)
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 3; ctx.strokeRect(20, 20, w - 40, h - 40)
  }
  const rand = rng(1515)
  if (opts.wood) {
    for (let i = 0; i < 30; i++) { ctx.strokeStyle = `rgba(0,0,0,${.04 + rand() * .08})`; ctx.beginPath(); ctx.moveTo(0, rand() * h); ctx.lineTo(w, rand() * h); ctx.stroke() }
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const fs = opts.fontSize || Math.min(w / Math.max(...lines.map(l => l.length)) * 1.6, h / (lines.length + .5))
  lines.forEach((line, i) => {
    ctx.font = `${opts.weight || 'bold'} ${fs}px ${opts.font || 'Impact, Arial Black, sans-serif'}`
    ctx.fillStyle = i === 1 && opts.accent ? opts.accent : (opts.color || '#f2ead7')
    const y = h / 2 + (i - (lines.length - 1) / 2) * fs * 1.05
    ctx.fillText(line, w / 2, y)
  })
  if (opts.distress) {
    for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(20,10,5,${rand() * .18})`; ctx.fillRect(rand() * w, rand() * h, rand() * 8, rand() * 3) }
  }
  const t = finish(c, { repeat: [1, 1] })
  cache.set(key, t); return t
}

export function neonTexture(text, color = '#ff5a24', bg = '#0a0c0a') {
  const key = 'neon-' + text + color
  if (cache.has(key)) return cache.get(key)
  const [c, ctx] = canvas(512, 160)
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 160)
  ctx.font = 'bold 84px Impact, Arial Black, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.shadowColor = color; ctx.shadowBlur = 26; ctx.fillStyle = color
  ctx.fillText(text, 256, 82)
  ctx.shadowBlur = 10; ctx.fillStyle = '#ffffff'; ctx.globalAlpha = .75
  ctx.fillText(text, 256, 82)
  const t = finish(c, { repeat: [1, 1] })
  cache.set(key, t); return t
}

export function starfieldTexture() {
  if (cache.has('stars')) return cache.get('stars')
  const [c, ctx] = canvas(256, 256)
  const rand = rng(1616)
  ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 260; i++) {
    const v = 100 + rand() * 155
    ctx.fillStyle = `rgba(${v},${v},${v},${.2 + rand() * .8})`
    ctx.fillRect(rand() * 256, rand() * 256, rand() < .1 ? 2 : 1, 1)
  }
  const t = finish(c, { repeat: [3, 3] })
  cache.set('stars', t); return t
}

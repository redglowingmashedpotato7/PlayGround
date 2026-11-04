import * as THREE from 'three'
import './style.css'
import { LEVELS } from './levels.js'
import { Hub } from './hub.js'
import { Level } from './level.js'
import {
  initAudio, startMusic, stopMusic, setMuted, isMuted, uiClick,
} from './audio.js'
import { drawFace } from './face.js'

/* ------------------------------------------------------------------ */
/* DOM                                                                */
/* ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id)
const ui = {
  canvas: $('scene'),
  intro: $('intro'),
  startBtn: $('startBtn'),
  hubUI: $('hub-ui'),
  levelHUD: $('level-hud'),
  loading: $('loading'),
  loadingKicker: $('loadingKicker'),
  loadingName: $('loadingName'),
  loadingTip: $('loadingTip'),
  pause: $('pause'),
  death: $('death'),
  complete: $('complete'),
  fade: $('fade'),
  toasts: $('toasts'),
  damageFlash: $('damageFlash'),
  crosshair: $('crosshair'),
  hoverTag: $('hoverTag'),
  hoverName: $('hoverName'),
  hoverAddr: $('hoverAddr'),
  listing: $('listing'),
  listStripe: $('listStripe'),
  listIndex: $('listIndex'),
  listStatus: $('listStatus'),
  listName: $('listName'),
  listAddr: $('listAddr'),
  listStars: $('listStars'),
  listDanger: $('listDanger'),
  listDesc: $('listDesc'),
  listDemons: $('listDemons'),
  listBest: $('listBest'),
  enterBtn: $('enterBtn'),
  enterSub: $('enterSub'),
  hubSold: $('hubSold'),
  hubSouls: $('hubSouls'),
  hpValue: $('hpValue'),
  hpBar: $('hpBar'),
  armorValue: $('armorValue'),
  ammoValue: $('ammoValue'),
  ammoReserve: $('ammoReserve'),
  ammoPips: $('ammoPips'),
  weaponName: $('weaponName'),
  soulSlots: $('soulSlots'),
  soulsStatus: $('soulsStatus'),
  objText: $('objText'),
  objBar: $('objBar'),
  killCount: $('killCount'),
  levelTimer: $('levelTimer'),
  minimap: $('minimap'),
  waypointArrow: $('waypointArrow'),
  waypointDist: $('waypointDist'),
  levelIndex: $('levelIndex'),
  levelName: $('levelName'),
  levelAddr: $('levelAddr'),
  levelSubtitle: $('levelSubtitle'),
  interactPrompt: $('interactPrompt'),
  lockHint: $('lockHint'),
  simFace: $('simFace'),
  touchControls: $('touch-controls'),
  stick: $('stick'),
  stickKnob: $('stickKnob'),
  btnFire: $('btnFire'),
  btnReload: $('btnReload'),
  btnSwitch: $('btnSwitch'),
  btnInteract: $('btnInteract'),
  btnPause: $('btnPause'),
  muteBtn: $('muteBtn'),
  resumeBtn: $('resumeBtn'),
  restartBtn: $('restartBtn'),
  leaveBtn: $('leaveBtn'),
  retryBtn: $('retryBtn'),
  deathLeaveBtn: $('deathLeaveBtn'),
  nextBtn: $('nextBtn'),
  winLeaveBtn: $('winLeaveBtn'),
  deathCopy: $('deathCopy'),
  deathKills: $('deathKills'),
  deathSouls: $('deathSouls'),
  deathTime: $('deathTime'),
  winKills: $('winKills'),
  winSouls: $('winSouls'),
  winTime: $('winTime'),
  winGrade: $('winGrade'),
  completeKicker: $('completeKicker'),
  completeTitle: $('completeTitle'),
  completeCopy: $('completeCopy'),
}

const SAVE_KEY = 'deadend-save-v1'
const isTouch = (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) && matchMedia('(pointer: coarse)').matches

/* ------------------------------------------------------------------ */
/* Save                                                               */
/* ------------------------------------------------------------------ */

function defaultSave() {
  return { cleared: [], best: {}, souls: 0 }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return defaultSave()
    const data = JSON.parse(raw)
    return {
      cleared: Array.isArray(data.cleared) ? data.cleared.filter((id) => LEVELS.some((l) => l.id === id)) : [],
      best: data.best && typeof data.best === 'object' ? data.best : {},
      souls: Number.isFinite(data.souls) ? data.souls : 0,
    }
  } catch {
    return defaultSave()
  }
}

let save = loadSave()

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) } catch { /* storage is optional */ }
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '—:—'
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/* Renderer and world                                                 */
/* ------------------------------------------------------------------ */

const canvas = ui.canvas
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.setSize(window.innerWidth, window.innerHeight, false)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.08
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

document.body.classList.toggle('touch', isTouch)

const hub = new Hub(LEVELS, save)
for (const id of save.cleared) hub.markCleared(id)

let level = null
let state = 'intro'
let selected = -1
let hovered = -1
let currentIndex = -1
let busy = false
let hasLocked = false
let hudAccum = 0
let lastEntry = 0
let lastAttempt = 0
let subtitleTimeout = 0
let fireHeld = false
let touchLook = null
let stickPointer = null
let hubPointer = null
let hubMoved = false

resize()

/* ------------------------------------------------------------------ */
/* UI helpers                                                         */
/* ------------------------------------------------------------------ */

function show(el) { el?.classList.remove('hidden') }
function hide(el) { el?.classList.add('hidden') }

function setOverlay(name) {
  hide(ui.pause); hide(ui.death); hide(ui.complete)
  if (name === 'pause') show(ui.pause)
  if (name === 'death') show(ui.death)
  if (name === 'complete') show(ui.complete)
}

function showHubUI(v) {
  ui.hubUI.classList.toggle('hidden', !v)
}

function showLevelHUD(v) {
  ui.levelHUD.classList.toggle('hidden', !v)
  ui.crosshair.classList.toggle('hidden', !v)
  if (!v) {
    ui.interactPrompt.classList.add('hidden')
    ui.levelSubtitle.classList.remove('on')
  }
  if (isTouch) ui.touchControls.classList.toggle('hidden', !v)
}

function fade(on) {
  ui.fade.classList.toggle('on', on)
}

function addToast(text, kind = '') {
  if (!text) return
  const el = document.createElement('div')
  el.className = `toast ${kind}`.trim()
  el.textContent = text
  ui.toasts.appendChild(el)
  while (ui.toasts.children.length > 4) ui.toasts.firstElementChild?.remove()
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transition = 'opacity .25s ease'
    setTimeout(() => el.remove(), 270)
  }, 3050)
}

function setSubtitle(text) {
  clearTimeout(subtitleTimeout)
  if (!text) {
    ui.levelSubtitle.classList.remove('on')
    return
  }
  ui.levelSubtitle.textContent = text
  ui.levelSubtitle.classList.add('on')
  subtitleTimeout = setTimeout(() => ui.levelSubtitle.classList.remove('on'), 5200)
}

function flashDamage() {
  ui.damageFlash.classList.remove('on')
  void ui.damageFlash.offsetWidth
  ui.damageFlash.classList.add('on')
  setTimeout(() => ui.damageFlash.classList.remove('on'), 130)
}

function hitmarker(kill) {
  ui.crosshair.classList.add('hit')
  if (kill) ui.crosshair.classList.add('kill')
  setTimeout(() => {
    ui.crosshair.classList.remove('hit')
    ui.crosshair.classList.remove('kill')
  }, kill ? 260 : 120)
}

function updateHubStats() {
  ui.hubSold.innerHTML = `${save.cleared.length}<span>/${LEVELS.length}</span>`
  ui.hubSouls.textContent = String(save.souls || 0)
}

function resetLevelInput() {
  if (!level) return
  level.input.forward = false
  level.input.back = false
  level.input.left = false
  level.input.right = false
  level.input.sprint = false
  level.input.touchX = 0
  level.input.touchY = 0
  resetStick()
}

/* ------------------------------------------------------------------ */
/* Hub listing                                                        */
/* ------------------------------------------------------------------ */

function fillListing(index) {
  const spec = LEVELS[index]
  if (!spec) return
  const cleared = save.cleared.includes(spec.id)
  const best = save.best[spec.id]
  ui.listIndex.textContent = `OPEN HOUSE ${String(index + 1).padStart(2, '0')}`
  ui.listStatus.textContent = cleared ? 'SOLD' : 'FOR SALE'
  ui.listStatus.classList.toggle('sold', cleared)
  ui.listName.textContent = spec.name
  ui.listAddr.textContent = spec.address
  ui.listStars.textContent = '★'.repeat(spec.danger) + '☆'.repeat(Math.max(0, 4 - spec.danger))
  ui.listDanger.textContent = spec.dangerLabel
  ui.listDesc.textContent = spec.blurb
  ui.listDemons.textContent = String(spec.enemies.length)
  ui.listBest.textContent = best ? formatTime(best) : '—:—'
  ui.enterSub.textContent = isTouch ? 'Touch controls enabled' : 'Mouse + keyboard'
  ui.enterBtn.querySelector('span').textContent = cleared ? 'TOUR IT AGAIN' : 'ENTER PROPERTY'
  ui.listStripe.style.background = cleared
    ? 'linear-gradient(90deg, #ffd166, #8a6a20 55%, transparent)'
    : `linear-gradient(90deg, ${hex(spec.theme.accent)}, #3d8a2d 55%, transparent)`
}

function hex(n) {
  return '#' + n.toString(16).padStart(6, '0')
}

function selectHouse(index) {
  if (state !== 'hub' || index < 0 || index >= LEVELS.length) return
  selected = index
  hub.setSelected(index)
  fillListing(index)
  show(ui.listing)
  ui.hoverTag.classList.add('hidden')
  uiClick()
}

function clearSelection() {
  selected = -1
  hub.setSelected(-1)
  hide(ui.listing)
}

/* ------------------------------------------------------------------ */
/* Level lifecycle                                                    */
/* ------------------------------------------------------------------ */

function enterLevel(index) {
  if (busy || state === 'loading' || index < 0 || index >= LEVELS.length) return
  const spec = LEVELS[index]
  busy = true
  currentIndex = index
  selected = index
  lastEntry = performance.now()
  ui.loadingKicker.textContent = index === LEVELS.length - 1 ? 'THE SELLER WILL SEE YOU NOW' : 'UNLOCKING THE FRONT DOOR'
  ui.loadingName.textContent = spec.name
  ui.loadingTip.textContent = `Tip: ${spec.tips[Math.floor(Math.random() * spec.tips.length)]}`
  show(ui.loading)
  fade(true)
  exitLock()
  resetLevelInput()

  setTimeout(() => {
    try {
      if (level) { level.dispose(); level = null }
      level = new Level(spec)
      level.resize(window.innerWidth / window.innerHeight)
      state = 'level'
      hide(ui.intro)
      hide(ui.loading)
      hide(ui.listing)
      hide(ui.hoverTag)
      showHubUI(false)
      showLevelHUD(true)
      setOverlay(null)
      hide(ui.loading)
      ui.lockHint.classList.toggle('hidden', isTouch)
      ui.levelIndex.textContent = String(spec.index).padStart(2, '0')
      ui.levelName.textContent = spec.name
      ui.levelAddr.textContent = spec.addr || spec.address.toUpperCase()
      hudAccum = 1
      updateHUD(true)
      startMusic(spec.theme.music)
      addToast(spec.tagline, 'gold')
      setTimeout(() => fade(false), 60)
    } catch (err) {
      console.error('Failed to open level', err)
      ui.loadingKicker.textContent = 'STRUCTURAL FAILURE'
      ui.loadingName.textContent = 'THE FLOOR PLAN IS CURSED'
      ui.loadingTip.textContent = String(err?.message || err)
      setTimeout(() => { hide(ui.loading); fade(false); busy = false; backToHub(true) }, 1600)
      return
    }
    busy = false
  }, 620)
}

function backToHub(force = false) {
  if (busy && !force) return
  busy = true
  exitLock()
  resetLevelInput()
  fade(true)
  setTimeout(() => {
    if (level) { level.dispose(); level = null }
    state = 'hub'
    currentIndex = -1
    showLevelHUD(false)
    setOverlay(null)
    hide(ui.loading)
    showHubUI(true)
    hide(ui.intro)
    hide(ui.listing)
    hide(ui.hoverTag)
    clearSelection()
    hub.resetView()
    updateHubStats()
    startMusic('hub')
    hudAccum = 0
    busy = false
    setTimeout(() => fade(false), 60)
  }, 340)
}

function pauseGame() {
  if (state !== 'level') return
  state = 'paused'
  resetLevelInput()
  setOverlay('pause')
  hide(ui.crosshair)
  hide(ui.interactPrompt)
  ui.lockHint.classList.add('hidden')
  exitLock()
  stopMusic()
}

function resumeGame() {
  if (state !== 'paused') return
  hide(ui.pause)
  state = 'level'
  show(ui.crosshair)
  setOverlay(null)
  startMusic(level?.spec.theme.music || 'hub')
  if (!isTouch) requestLock()
  else ui.lockHint.classList.add('hidden')
}

function showDeath(stats) {
  if (state === 'dead' || state === 'won') return
  state = 'dead'
  exitLock()
  resetLevelInput()
  stopMusic()
  ui.deathKills.textContent = `${stats.kills} / ${stats.total}`
  ui.deathSouls.textContent = `${stats.souls} / 3`
  ui.deathTime.textContent = formatTime(stats.time)
  const copy = [
    'The seller has accepted your offer. Unfortunately, so has the basement.',
    'Your open house has closed. Permanently.',
    'The HOA voted. The vote was unanimous. You were not invited.',
  ]
  ui.deathCopy.textContent = copy[Math.floor(Math.random() * copy.length)]
  setOverlay('death')
  hide(ui.crosshair)
  hide(ui.interactPrompt)
  hide(ui.loading)
  show(ui.death)
}

function showWin(stats) {
  if (state === 'won') return
  state = 'won'
  exitLock()
  resetLevelInput()
  stopMusic()
  const spec = LEVELS[currentIndex]
  const firstClear = spec && !save.cleared.includes(spec.id)
  if (spec && firstClear) save.cleared.push(spec.id)
  if (spec) {
    const best = save.best[spec.id]
    if (!best || stats.time < best) save.best[spec.id] = Number(stats.time.toFixed(1))
  }
  save.souls = (save.souls || 0) + (stats.souls || 0)
  persist()
  if (spec) hub.markCleared(spec.id)
  updateHubStats()
  ui.winKills.textContent = `${stats.kills} / ${stats.total}`
  ui.winSouls.textContent = `${stats.souls} / 3`
  ui.winTime.textContent = formatTime(stats.time)
  ui.winGrade.textContent = `GRADE ${stats.grade}`
  ui.completeKicker.textContent = firstClear ? 'PROPERTY CLEANSED' : 'PROPERTY STILL CLEANSED'
  ui.completeTitle.textContent = firstClear ? 'HOUSE CLEARED' : 'ANOTHER CLEAN TOUR'
  ui.completeCopy.textContent = firstClear
    ? 'The open house is closed. The neighbors are thrilled.'
    : 'The HOA thanks you for your continued service. Please stop coming back.'
  const hasNext = currentIndex < LEVELS.length - 1
  ui.nextBtn.querySelector('span').textContent = hasNext ? 'NEXT OPEN HOUSE' : 'BACK TO THE NEIGHBORHOOD'
  setOverlay('complete')
  hide(ui.crosshair)
  hide(ui.interactPrompt)
  hide(ui.loading)
  show(ui.complete)
}

function retryLevel() {
  const index = currentIndex
  if (index < 0) { backToHub(); return }
  setOverlay(null)
  enterLevel(index)
}

/* ------------------------------------------------------------------ */
/* HUD                                                                */
/* ------------------------------------------------------------------ */

const minimapCtx = ui.minimap.getContext('2d')
const faceCtx = ui.simFace.getContext('2d')

function renderAmmoPips(clip, maxClip) {
  if (!ui.ammoPips) return
  const count = Number.isFinite(maxClip) ? maxClip : 8
  const filled = Number.isFinite(clip) ? clip : count
  if (ui.ammoPips.children.length !== count) {
    ui.ammoPips.innerHTML = ''
    for (let i = 0; i < count; i++) ui.ammoPips.appendChild(document.createElement('i'))
  }
  const pips = ui.ammoPips.children
  for (let i = 0; i < count; i++) pips[i].classList.toggle('empty', i >= filled)
}

function updateHUD(force = false) {
  if (!level) return
  const h = level.getHud()

  ui.hpValue.textContent = String(Math.max(0, Math.round(h.health)))
  const hpPct = Math.max(0, Math.min(100, h.health))
  ui.hpBar.style.width = `${hpPct}%`
  ui.hpBar.classList.toggle('low', hpPct <= 35)
  ui.armorValue.textContent = String(Math.max(0, Math.round(h.armor)))

  ui.ammoValue.textContent = Number.isFinite(h.clip) ? String(h.clip) : '∞'
  ui.ammoReserve.textContent = Number.isFinite(h.reserve) ? `/ ${h.reserve}` : '/ ∞'
  ui.weaponName.textContent = h.weaponName
  renderAmmoPips(h.clip, h.maxClip)

  ui.objText.textContent = h.objective
  ui.objBar.style.width = `${h.portalOpen ? 100 : (h.souls / 3) * 100}%`
  ui.killCount.textContent = `${h.kills} / ${h.totalKills}`
  ui.levelTimer.textContent = formatTime(h.time)

  const slots = ui.soulSlots.children
  for (let i = 0; i < slots.length; i++) slots[i].classList.toggle('filled', i < h.souls)
  ui.soulsStatus.textContent = h.portalOpen ? 'PORTAL OPEN' : 'PORTAL SEALED'
  ui.soulsStatus.classList.toggle('open', h.portalOpen)

  const showPrompt = h.portalOpen && h.nearExit && state === 'level'
  ui.interactPrompt.classList.toggle('hidden', !showPrompt)
  if (showPrompt) ui.interactPrompt.innerHTML = '<span class="key-chip">E</span> <b>STEP INTO THE PORTAL</b>'

  const locked = document.pointerLockElement === canvas
  ui.lockHint.classList.toggle('hidden', isTouch || locked || state !== 'level')

  if (level.subtitleText) {
    ui.levelSubtitle.textContent = level.subtitleText
    ui.levelSubtitle.classList.add('on')
  } else {
    ui.levelSubtitle.classList.remove('on')
  }

  const wp = level.getWaypoint()
  if (wp) {
    const dx = wp.x - level.player.x
    const dz = wp.z - level.player.z
    const dist = Math.hypot(dx, dz)
    const yaw = level.player.yaw
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw)
    const rx = Math.cos(yaw), rz = -Math.sin(yaw)
    const dot = dx * fx + dz * fz
    const cross = dx * rx + dz * rz
    const angle = Math.atan2(cross, dot) * 180 / Math.PI
    ui.waypointArrow.style.transform = `rotate(${angle.toFixed(1)}deg)`
    ui.waypointDist.textContent = `${Math.round(dist)}M`
    ui.waypointArrow.style.color = wp.type === 'exit' ? '#b8ff3d' : '#57e6ff'
    ui.waypointDist.style.color = wp.type === 'exit' ? '#b8ff3d' : '#57e6ff'
  } else {
    ui.waypointArrow.style.transform = 'rotate(0deg)'
    ui.waypointDist.textContent = '—'
  }

  drawFace(faceCtx, {
    health: h.health,
    armor: h.armor,
    weapon: h.weapon,
    hurt: level.shake > 0.35,
    time: h.time,
  })

  level.drawMinimap(minimapCtx, ui.minimap.width, ui.minimap.height)
}

/* ------------------------------------------------------------------ */
/* Level events                                                       */
/* ------------------------------------------------------------------ */

function processEvents() {
  if (!level) return
  const events = level.drainEvents()
  for (const ev of events) {
    switch (ev.type) {
      case 'toast':
        addToast(ev.text, ev.kind)
        break
      case 'subtitle':
        setSubtitle(ev.text)
        break
      case 'damage':
        flashDamage()
        break
      case 'hitmarker':
        hitmarker(ev.kill)
        break
      case 'orb':
        addToast(`SOUL ORB ${ev.souls}/3 BANKED`, 'soul')
        break
      case 'death':
        showDeath(ev.stats)
        break
      case 'win':
        showWin(ev.stats)
        break
      default:
        break
    }
  }
}

/* ------------------------------------------------------------------ */
/* Pointer lock and mouse                                             */
/* ------------------------------------------------------------------ */

function requestLock() {
  if (state !== 'level' || isTouch) return
  try {
    const p = canvas.requestPointerLock?.()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch { /* pointer lock may be refused */ }
}

function exitLock() {
  if (document.pointerLockElement) {
    try { document.exitPointerLock() } catch { /* ignore */ }
  }
}

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas
  if (locked) {
    hasLocked = true
    ui.lockHint.classList.add('hidden')
  } else {
    ui.lockHint.classList.toggle('hidden', isTouch || state !== 'level')
    if (hasLocked && state === 'level') pauseGame()
    hasLocked = false
  }
})

document.addEventListener('mousemove', (e) => {
  if (state === 'level' && document.pointerLockElement === canvas && level) {
    level.look(e.movementX || 0, e.movementY || 0)
  }
})

canvas.addEventListener('contextmenu', (e) => e.preventDefault())

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if (state === 'hub') {
    hubPointer = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }
    hubMoved = false
    canvas.setPointerCapture?.(e.pointerId)
    return
  }
  if (state !== 'level') return
  if (e.pointerType === 'mouse') {
    if (document.pointerLockElement !== canvas) {
      requestLock()
      return
    }
    fireHeld = true
    level.fire()
  } else {
    touchLook = { id: e.pointerId, x: e.clientX, y: e.clientY }
    canvas.setPointerCapture?.(e.pointerId)
  }
})

canvas.addEventListener('pointermove', (e) => {
  if (state === 'hub') {
    if (hubPointer && hubPointer.id === e.pointerId) {
      const dx = e.clientX - hubPointer.x
      const dy = e.clientY - hubPointer.y
      if (Math.abs(e.clientX - hubPointer.sx) + Math.abs(e.clientY - hubPointer.sy) > 5) hubMoved = true
      if (hubMoved) hub.handleDrag(dx, dy)
      hubPointer.x = e.clientX
      hubPointer.y = e.clientY
    } else if (e.pointerType === 'mouse') {
      updateHover(e)
    }
    return
  }
  if (state === 'level' && touchLook && touchLook.id === e.pointerId) {
    const dx = e.clientX - touchLook.x
    const dy = e.clientY - touchLook.y
    level?.look(dx * 1.45, dy * 1.45, 0.0026)
    touchLook.x = e.clientX
    touchLook.y = e.clientY
  }
})

canvas.addEventListener('pointerup', (e) => {
  if (state === 'hub') {
    if (hubPointer && hubPointer.id === e.pointerId) {
      const moved = hubMoved || Math.abs(e.clientX - hubPointer.sx) + Math.abs(e.clientY - hubPointer.sy) > 7
      hubPointer = null
      hub.endDrag()
      if (!moved) hubClick(e)
    }
    return
  }
  if (touchLook && touchLook.id === e.pointerId) touchLook = null
  if (e.pointerType === 'mouse') fireHeld = false
})

canvas.addEventListener('pointercancel', (e) => {
  if (touchLook && touchLook.id === e.pointerId) touchLook = null
  if (hubPointer && hubPointer.id === e.pointerId) { hubPointer = null; hub.endDrag() }
})

canvas.addEventListener('pointerleave', (e) => {
  if (state === 'hub' && e.pointerType === 'mouse') {
    hub.setHover(-1)
    hovered = -1
    ui.hoverTag.classList.add('hidden')
  }
})

canvas.addEventListener('wheel', (e) => {
  if (state !== 'hub') return
  e.preventDefault()
  hub.zoom(e.deltaY)
}, { passive: false })

function hubClick(e) {
  const rect = canvas.getBoundingClientRect()
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  )
  const index = hub.pick(ndc)
  if (index >= 0) selectHouse(index)
  else clearSelection()
}

function updateHover(e) {
  const rect = canvas.getBoundingClientRect()
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  )
  const index = hub.pick(ndc)
  hub.setHover(index)
  hovered = index
  if (index >= 0) {
    const spec = LEVELS[index]
    ui.hoverName.textContent = spec.name
    ui.hoverAddr.textContent = spec.address
    show(ui.hoverTag)
  } else {
    hide(ui.hoverTag)
  }
}

function positionHoverTag() {
  if (state !== 'hub' || hovered < 0) return
  const p = hub.labelScreen(hovered)
  if (!p || !p.visible) {
    hide(ui.hoverTag)
    return
  }
  ui.hoverTag.style.left = `${p.x}%`
  ui.hoverTag.style.top = `${p.y}%`
  show(ui.hoverTag)
}

/* ------------------------------------------------------------------ */
/* Keyboard                                                           */
/* ------------------------------------------------------------------ */

const moveKeys = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) {
    if (moveKeys[e.code] || e.code === 'Space') e.preventDefault()
    return
  }
  const mv = moveKeys[e.code]
  if (mv) {
    if (state === 'level' && level) { level.input[mv] = true; e.preventDefault() }
    return
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    if (state === 'level' && level) level.input.sprint = true
    return
  }
  if (e.code === 'Escape') {
    if (state === 'level') pauseGame()
    else if (state === 'paused') resumeGame()
    return
  }
  if (e.code === 'KeyP') {
    if (state === 'level') pauseGame()
    else if (state === 'paused') resumeGame()
    return
  }
  if (state === 'hub') {
    if (/^Digit[1-4]$/.test(e.code)) selectHouse(Number(e.code.slice(-1)) - 1)
    else if (e.code === 'Enter' && selected >= 0) enterLevel(selected)
    else if (e.code === 'Escape') clearSelection()
    return
  }
  if (state !== 'level' || !level) return
  if (e.code === 'KeyR') { level.reload(); e.preventDefault() }
  else if (e.code === 'KeyE') { level.interact(); e.preventDefault() }
  else if (e.code === 'Digit1') level.switchWeapon('shotgun')
  else if (e.code === 'Digit2') level.switchWeapon('pistol')
  else if (e.code === 'KeyQ') level.toggleWeapon()
  else if (e.code === 'Space') { level.fire(); e.preventDefault() }
})

window.addEventListener('keyup', (e) => {
  const mv = moveKeys[e.code]
  if (mv) {
    if (level) level.input[mv] = false
    return
  }
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && level) level.input.sprint = false
})

/* ------------------------------------------------------------------ */
/* Touch                                                              */
/* ------------------------------------------------------------------ */

function resetStick() {
  if (!ui.stickKnob) return
  ui.stickKnob.style.transform = 'translate(0px, 0px)'
}

function initStick() {
  if (!ui.stick) return
  const moveStick = (e) => {
    if (!stickPointer || stickPointer.id !== e.pointerId || !level) return
    const dx = e.clientX - stickPointer.cx
    const dy = e.clientY - stickPointer.cy
    const max = 40
    const len = Math.hypot(dx, dy) || 1
    const n = Math.min(1, len / max)
    const nx = (dx / len) * n
    const ny = (dy / len) * n
    ui.stickKnob.style.transform = `translate(${nx * max}px, ${ny * max}px)`
    level.input.touchX = n > 0.12 ? nx : 0
    level.input.touchY = n > 0.12 ? -ny : 0
  }
  ui.stick.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    const r = ui.stick.getBoundingClientRect()
    stickPointer = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
    ui.stick.setPointerCapture?.(e.pointerId)
    moveStick(e)
  })
  ui.stick.addEventListener('pointermove', (e) => {
    e.preventDefault()
    moveStick(e)
  })
  const end = (e) => {
    if (stickPointer && stickPointer.id === e.pointerId) {
      stickPointer = null
      if (level) { level.input.touchX = 0; level.input.touchY = 0 }
      resetStick()
    }
  }
  ui.stick.addEventListener('pointerup', end)
  ui.stick.addEventListener('pointercancel', end)
  ui.stick.addEventListener('pointerleave', (e) => { if (e.buttons === 0) end(e) })
}

if (isTouch) {
  initStick()
  ui.btnFire?.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation()
    if (state === 'level') level?.fire()
  })
  ui.btnReload?.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation()
    if (state === 'level') level?.reload()
  })
  ui.btnSwitch?.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation()
    if (state === 'level') level?.toggleWeapon()
  })
  ui.btnInteract?.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation()
    if (state === 'level') level?.interact()
  })
  ui.btnPause?.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation()
    if (state === 'level') pauseGame()
  })
}

/* ------------------------------------------------------------------ */
/* Buttons                                                            */
/* ------------------------------------------------------------------ */

ui.startBtn.addEventListener('click', () => {
  initAudio()
  startMusic('hub')
  uiClick()
  state = 'hub'
  hide(ui.intro)
  showHubUI(true)
  updateHubStats()
  if (!isTouch) addToast('CLICK A PROPERTY TO READ THE LISTING. STEP INSIDE TO CLEANSE IT.', 'gold')
})

ui.enterBtn.addEventListener('click', () => {
  if (selected < 0) selectHouse(0)
  if (selected >= 0) enterLevel(selected)
})
ui.hoverTag.addEventListener('click', () => { if (hovered >= 0) selectHouse(hovered) })

ui.resumeBtn.addEventListener('click', resumeGame)
ui.restartBtn.addEventListener('click', () => {
  const index = currentIndex
  hide(ui.pause)
  if (index >= 0) enterLevel(index)
  else backToHub()
})
ui.leaveBtn.addEventListener('click', () => backToHub())

ui.retryBtn.addEventListener('click', retryLevel)
ui.deathLeaveBtn.addEventListener('click', () => backToHub())
ui.winLeaveBtn.addEventListener('click', () => backToHub())
ui.nextBtn.addEventListener('click', () => {
  if (currentIndex >= 0 && currentIndex < LEVELS.length - 1) enterLevel(currentIndex + 1)
  else backToHub()
})

ui.muteBtn.addEventListener('click', () => {
  initAudio()
  const muted = setMuted(!isMuted())
  ui.muteBtn.classList.toggle('muted', muted)
  ui.muteBtn.setAttribute('aria-label', muted ? 'Enable sound' : 'Toggle sound')
})

/* ------------------------------------------------------------------ */
/* Window                                                             */
/* ------------------------------------------------------------------ */

function resize() {
  const w = window.innerWidth, h = window.innerHeight
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(w, h, false)
  hub.camera.aspect = w / h
  hub.camera.updateProjectionMatrix()
  level?.resize(w / h)
}
window.addEventListener('resize', resize)
window.addEventListener('orientationchange', () => setTimeout(resize, 180))
window.addEventListener('blur', () => { if (state === 'level') pauseGame() })

/* ------------------------------------------------------------------ */
/* Loop                                                               */
/* ------------------------------------------------------------------ */

let last = performance.now()

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
  last = now

  if (state === 'intro' || state === 'hub') {
    hub.update(dt)
    positionHoverTag()
    renderer.render(hub.scene, hub.camera)
    return
  }

  if (!level) {
    hub.update(dt)
    renderer.render(hub.scene, hub.camera)
    return
  }

  if (state === 'level') {
    level.update(dt)
    processEvents()
    hudAccum += dt
    if (hudAccum > 0.075) { hudAccum = 0; updateHUD() }
    // Keep the trigger running while the mouse button is held. The weapon's own
    // fire rate limits the cadence.
    if (fireHeld && document.pointerLockElement === canvas && now - lastAttempt > 90) {
      lastAttempt = now
      level.fire()
    }
  } else if (state === 'dead' || state === 'won') {
    level.update(dt)
    processEvents()
  } else if (state === 'paused') {
    // Keep the world frozen but let the weapon viewmodel settle.
    level.weapons.update(dt, { x: 0, y: 0 }, false)
  }

  level.render(renderer)
}

requestAnimationFrame(frame)

/* ------------------------------------------------------------------ */
/* Debug hook used by automated capture and smoke tests.              */
/* ------------------------------------------------------------------ */

window.DEADEND = {
  get state() { return state },
  get level() { return level },
  get hub() { return hub },
  get save() { return save },
  start() {
    if (state === 'intro') ui.startBtn.click()
  },
  enterLevel,
  selectHouse,
  backToHub,
  pauseGame,
  resumeGame,
  updateHUD,
  levels: LEVELS,
}

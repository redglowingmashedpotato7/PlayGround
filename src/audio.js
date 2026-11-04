let ctx = null
let master = null
let sfxBus = null
let musicBus = null
let noiseBuffer = null
let muted = false
let musicTimer = null
let musicMode = null
let step = 0

const VOLUME = 0.55

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : VOLUME
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 5
  master.connect(comp).connect(ctx.destination)
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master)
  musicBus = ctx.createGain(); musicBus.gain.value = 0.2; musicBus.connect(master)

  const len = 2 * ctx.sampleRate
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = noiseBuffer.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
}

export function setMuted(v) {
  muted = v
  if (master) master.gain.setTargetAtTime(v ? 0 : VOLUME, ctx.currentTime, 0.03)
  return muted
}

export function isMuted() { return muted }

function now() { return ctx ? ctx.currentTime : 0 }

function tone(type, freq, dur, gain = 0.2, opts = {}) {
  if (!ctx) return
  const t = now() + (opts.delay || 0)
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + dur)
  if (opts.detune) o.detune.value = opts.detune
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + (opts.attack || 0.006))
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  if (opts.filter) {
    const f = ctx.createBiquadFilter()
    f.type = opts.filter; f.frequency.value = opts.freq || 800; f.Q.value = opts.q || 1
    o.connect(f).connect(g)
  } else o.connect(g)
  g.connect(opts.bus === 'music' ? musicBus : sfxBus)
  o.start(t); o.stop(t + dur + 0.05)
}

function noise(dur, gain = 0.2, opts = {}) {
  if (!ctx || !noiseBuffer) return
  const t = now() + (opts.delay || 0)
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  const g = ctx.createGain()
  const f = ctx.createBiquadFilter()
  f.type = opts.filter || 'lowpass'
  f.frequency.setValueAtTime(opts.freq || 1200, t)
  if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, t + dur)
  f.Q.value = opts.q || 0.7
  g.gain.setValueAtTime(Math.max(0.0002, gain), t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g)
  g.connect(opts.bus === 'music' ? musicBus : sfxBus)
  src.start(t)
  src.stop(t + dur + 0.05)
}

export function uiClick() {
  tone('square', 560, 0.06, 0.07, { to: 420 })
  tone('sine', 880, 0.08, 0.035, { delay: 0.02 })
}

export function shotgun() {
  if (!ctx) return
  noise(0.26, 0.62, { filter: 'lowpass', freq: 3400, freqTo: 300 })
  noise(0.08, 0.4, { filter: 'highpass', freq: 1800 })
  tone('sine', 150, 0.28, 0.52, { to: 36 })
  tone('square', 92, 0.11, 0.2, { to: 45 })
  noise(0.12, 0.18, { delay: 0.3, filter: 'highpass', freq: 1000 })
}

export function pistol() {
  noise(0.1, 0.32, { filter: 'bandpass', freq: 2200, q: 0.8 })
  tone('square', 260, 0.09, 0.2, { to: 70 })
  tone('sine', 110, 0.12, 0.22, { to: 50 })
}

export function dryFire() {
  noise(0.05, 0.16, { filter: 'highpass', freq: 2600 })
  tone('square', 180, 0.03, 0.05)
}

export function reload() {
  noise(0.055, 0.15, { filter: 'highpass', freq: 2400 })
  noise(0.06, 0.16, { filter: 'highpass', freq: 1800, delay: 0.19 })
  tone('square', 300, 0.04, 0.05, { delay: 0.2 })
  noise(0.09, 0.2, { filter: 'bandpass', freq: 900, delay: 0.62 })
}

export function pickup(kind = 'health') {
  const base = kind === 'armor' ? 430 : kind === 'ammo' ? 300 : 540
  tone('sine', base, 0.12, 0.12)
  tone('sine', base * 1.5, 0.16, 0.09, { delay: 0.07 })
  if (kind === 'health') tone('sine', base * 2, 0.2, 0.06, { delay: 0.14 })
}

export function soul() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => tone('sine', f, 0.5, 0.1, { delay: i * 0.08, bus: 'music' }))
  tone('sine', 261.6, 0.7, 0.12, { bus: 'music' })
  noise(0.5, 0.05, { filter: 'highpass', freq: 5000 })
}

export function hurt() {
  tone('sawtooth', 160, 0.22, 0.24, { to: 60, filter: 'lowpass', freq: 500 })
  noise(0.18, 0.2, { filter: 'lowpass', freq: 700, freqTo: 200 })
}

export function enemyHit() {
  noise(0.08, 0.22, { filter: 'bandpass', freq: 520, q: 1.4 })
  tone('sawtooth', 190, 0.1, 0.1, { to: 110 })
}

export function enemyDeath() {
  tone('sawtooth', 150, 0.5, 0.2, { to: 34, filter: 'lowpass', freq: 420 })
  noise(0.35, 0.2, { filter: 'lowpass', freq: 800, freqTo: 120 })
}

export function growl() {
  tone('sawtooth', 62, 0.6, 0.12, { to: 45, filter: 'lowpass', freq: 240 })
  noise(0.4, 0.05, { filter: 'bandpass', freq: 300 })
}

export function fireball() {
  noise(0.28, 0.16, { filter: 'bandpass', freq: 900, freqTo: 300 })
  tone('sawtooth', 220, 0.22, 0.06, { to: 80 })
}

export function footstep() {
  noise(0.07, 0.06, { filter: 'lowpass', freq: 380 })
}

export function portalOpen() {
  tone('sine', 90, 1.4, 0.15, { to: 360, bus: 'music' })
  tone('sine', 135, 1.4, 0.1, { to: 540, bus: 'music' })
  noise(1.2, 0.08, { filter: 'bandpass', freq: 600, freqTo: 2400 })
}

export function portalEnter() {
  tone('sine', 220, 1.2, 0.2, { to: 880 })
  tone('sine', 330, 1.2, 0.12, { to: 1320, delay: 0.1 })
}

export function win() {
  const notes = [392, 523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => tone('triangle', f, 0.7, 0.12, { delay: i * 0.14, bus: 'music' }))
  tone('sine', 196, 1.4, 0.1, { bus: 'music' })
}

export function death() {
  tone('sawtooth', 110, 1.7, 0.24, { to: 28, filter: 'lowpass', freq: 400 })
  noise(1.3, 0.16, { filter: 'lowpass', freq: 500, freqTo: 80 })
}

export function flush() {
  noise(0.7, 0.12, { filter: 'bandpass', freq: 700, freqTo: 180, q: 0.8 })
}

/* ---------------------------------------------------------------- */
/* Music                                                             */
/* ---------------------------------------------------------------- */

function pad(freqs, dur, gain = 0.08, delay = 0) {
  if (!ctx) return
  for (const f of freqs) {
    const t = now() + delay
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = f
    o.detune.value = (Math.random() - 0.5) * 12
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.35)
    g.gain.linearRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(musicBus)
    o.start(t); o.stop(t + dur + 0.05)
  }
}

function bird() {
  const f = 1500 + Math.random() * 1600
  tone('sine', f, 0.08, 0.025, { to: f * 1.5, bus: 'music' })
  tone('sine', f * 1.5, 0.07, 0.02, { to: f * 1.1, delay: 0.1, bus: 'music' })
}

function scheduleMusic() {
  if (!ctx || !musicMode) return
  step++
  if (musicMode === 'hub') {
    if (step % 16 === 0) {
      const chords = [[196, 246.94, 293.66], [174.61, 220, 261.63], [220, 261.63, 329.63], [164.81, 207.65, 246.94]]
      pad(chords[Math.floor(step / 16) % 4], 7.5, 0.038)
    }
    if (step % 9 === 0 && Math.random() < 0.8) bird()
    return
  }
  const bpm = musicMode === 'crimson' ? 108 : musicMode === 'toxic' ? 124 : musicMode === 'marble' ? 96 : 112
  const beat = 60 / bpm
  if (step % 2 === 0) {
    tone('sine', 120, 0.2, 0.18, { to: 42, bus: 'music' })
    noise(0.06, 0.05, { filter: 'highpass', freq: 6000, bus: 'music' })
  } else {
    noise(0.045, 0.03, { filter: 'highpass', freq: 7000, bus: 'music' })
  }
  const seq = musicMode === 'crimson' ? [55, 55, 65.41, 55, 49, 55, 73.42, 55]
    : musicMode === 'toxic' ? [65.41, 65.41, 77.78, 87.31, 65.41, 58.27, 77.78, 87.31]
      : musicMode === 'marble' ? [43.65, 43.65, 51.91, 43.65, 58.27, 51.91, 43.65, 49]
        : [55, 55, 61.74, 55, 49, 55, 65.41, 58.27]
  if (step % 2 === 1) tone('sawtooth', seq[(step >> 1) % seq.length], beat * 1.7, 0.07, { filter: 'lowpass', freq: 220, bus: 'music' })
  if (step % 16 === 0) pad([seq[0] * 4, seq[0] * 6], 6, 0.022)
  if (step % 32 === 0 && musicMode !== 'verdant') noise(1.4, 0.045, { filter: 'bandpass', freq: 300, freqTo: 900, bus: 'music' })
}

export function startMusic(mode) {
  stopMusic()
  if (!ctx) return
  musicMode = mode
  step = 0
  const interval = mode === 'hub' ? 500 : 240
  musicTimer = setInterval(scheduleMusic, interval)
  scheduleMusic()
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer)
  musicTimer = null
  musicMode = null
}

export function audioReady() { return !!ctx }

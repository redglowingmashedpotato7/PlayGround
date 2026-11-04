import * as THREE from 'three'
import { box, cylinder, sphere, material, glow, basicMaterial } from './art.js'
import { flameTexture } from './textures.js'
import { shotgun as sfxShotgun, pistol as sfxPistol, dryFire, reload as sfxReload, uiClick } from './audio.js'

const GUNMETAL = 0x2a2d2e
const DARKSTEEL = 0x141617
const WOOD = 0x6b4326
const BRASS = 0xb08a44
const SKIN = 0xb07a52
const SLEEVE = 0x304a3a

function hand(parent, x, y, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = rot; parent.add(g)
  box(g, SKIN, 0.11, 0.16, 0.14, 0, 0, 0, { roughness: 0.85 })
  for (let i = 0; i < 4; i++) {
    box(g, SKIN, 0.024, 0.055, 0.1, -0.04 + i * 0.026, 0.085, -0.07, { rotX: 0.4, roughness: 0.85 })
  }
  box(g, SLEEVE, 0.13, 0.17, 0.24, 0, -0.12, 0.16, { roughness: 0.95 })
  box(g, 0x243a2e, 0.13, 0.02, 0.25, 0, -0.04, 0.16, { roughness: 0.95 })
  return g
}

function buildShotgun() {
  const g = new THREE.Group()
  // stock
  box(g, WOOD, 0.13, 0.18, 0.55, 0, -0.05, 0.25, { roughness: 0.55 })
  box(g, WOOD, 0.15, 0.26, 0.26, 0, -0.04, 0.02, { roughness: 0.55 })
  // receiver
  box(g, GUNMETAL, 0.13, 0.14, 0.4, 0, 0.03, -0.22, { metalness: 0.75, roughness: 0.3 })
  box(g, DARKSTEEL, 0.14, 0.025, 0.35, 0, -0.04, -0.22, { metalness: 0.6, roughness: 0.35 })
  // barrel
  const barrel = cylinder(g, GUNMETAL, 0.032, 0.92, 0, 0.075, -0.72, { rotX: Math.PI / 2, metalness: 0.8, roughness: 0.26 })
  const mag = cylinder(g, GUNMETAL, 0.026, 0.8, 0, 0.025, -0.68, { rotX: Math.PI / 2, metalness: 0.8, roughness: 0.3 })
  // muzzle
  cylinder(g, DARKSTEEL, 0.044, 0.08, 0, 0.075, -1.17, { rotX: Math.PI / 2, metalness: 0.7, roughness: 0.3 })
  // pump
  const pump = box(g, WOOD, 0.11, 0.1, 0.34, 0, 0.0, -0.55, { roughness: 0.55 })
  for (let i = 0; i < 4; i++) box(g, 0x4a2c18, 0.115, 0.015, 0.02, 0, 0.055, -0.68 + i * 0.08)
  // trigger guard + trigger
  const tg = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 12, Math.PI), material(DARKSTEEL, { metalness: 0.7, roughness: 0.3 }))
  tg.position.set(0, -0.11, -0.12); tg.rotation.x = Math.PI / 2; g.add(tg)
  box(g, DARKSTEEL, 0.02, 0.06, 0.015, 0, -0.1, -0.1, { rotX: 0.4 })
  // sight
  box(g, BRASS, 0.02, 0.03, 0.02, 0, 0.11, -1.12)
  box(g, DARKSTEEL, 0.05, 0.02, 0.04, 0, 0.115, -0.35)
  // shell
  cylinder(g, 0xb02a1a, 0.018, 0.06, 0.08, -0.0, -0.02, { rotZ: Math.PI / 2, low: true })
  // hands
  hand(g, 0.02, -0.17, 0.05, -0.15)
  hand(g, -0.01, -0.12, -0.55, 0.25)
  // flash
  const flashMat = new THREE.SpriteMaterial({ map: flameTexture(), color: 0xffc060, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const flash = new THREE.Sprite(flashMat)
  flash.position.set(0, 0.075, -1.22); flash.scale.set(0.45, 0.65, 1)
  g.add(flash)
  const flashLight = new THREE.PointLight(0xffa040, 0, 3, 2)
  flashLight.position.set(0, 0.1, -1.2)
  g.add(flashLight)
  g.userData = { flash, flashLight, pump, base: { x: 0.33, y: -0.33, z: -0.82 }, muzzle: new THREE.Vector3(0, 0.075, -1.22) }
  return g
}

function buildPistol() {
  const g = new THREE.Group()
  box(g, GUNMETAL, 0.1, 0.12, 0.4, 0, 0.0, -0.12, { metalness: 0.8, roughness: 0.25 })
  box(g, DARKSTEEL, 0.08, 0.2, 0.13, 0, -0.13, 0.02, { rotX: -0.18, metalness: 0.5, roughness: 0.4 })
  box(g, WOOD, 0.085, 0.2, 0.14, 0, -0.13, 0.03, { rotX: -0.18, roughness: 0.55 })
  cylinder(g, DARKSTEEL, 0.024, 0.14, 0, 0.02, -0.38, { rotX: Math.PI / 2, metalness: 0.8, roughness: 0.25 })
  box(g, GUNMETAL, 0.025, 0.035, 0.06, 0, 0.075, -0.3, { metalness: 0.7 })
  box(g, BRASS, 0.02, 0.025, 0.02, 0, 0.075, -0.35)
  box(g, DARKSTEEL, 0.03, 0.02, 0.02, 0, 0.085, -0.02)
  // trigger guard
  const tg = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12, Math.PI), material(DARKSTEEL, { metalness: 0.6, roughness: 0.35 }))
  tg.position.set(0, -0.09, -0.05); tg.rotation.x = Math.PI / 2; g.add(tg)
  hand(g, 0.01, -0.18, 0.07, -0.12)
  const flashMat = new THREE.SpriteMaterial({ map: flameTexture(), color: 0xffd080, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const flash = new THREE.Sprite(flashMat)
  flash.position.set(0, 0.02, -0.48); flash.scale.set(0.26, 0.36, 1)
  g.add(flash)
  const flashLight = new THREE.PointLight(0xffa040, 0, 2, 2)
  flashLight.position.set(0, 0.05, -0.45)
  g.add(flashLight)
  g.userData = { flash, flashLight, base: { x: 0.3, y: -0.3, z: -0.78 }, muzzle: new THREE.Vector3(0, 0.02, -0.48) }
  return g
}

export class WeaponSystem {
  constructor(callbacks = {}) {
    this.callbacks = callbacks
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.01, 10)
    this.camera.position.set(0, 0, 0)
    this.ambient = new THREE.AmbientLight(0xdfe8ff, 1.1)
    this.scene.add(this.ambient)
    const key = new THREE.DirectionalLight(0xffe0b0, 2.4); key.position.set(1.2, 1.5, 2); this.scene.add(key)
    const rim = new THREE.DirectionalLight(0x7aa8ff, 1.0); rim.position.set(-1.5, 0.3, -1); this.scene.add(rim)

    this.shotgun = buildShotgun()
    this.pistol = buildPistol()
    this.scene.add(this.shotgun, this.pistol)

    this.weapons = {
      shotgun: { group: this.shotgun, clip: 8, maxClip: 8, reserve: 32, name: 'PUMP SHOTGUN', fireRate: 0.82, damage: 15, pellets: 8, spread: 0.052, reloadTime: 1.65, auto: false },
      pistol: { group: this.pistol, clip: Infinity, maxClip: Infinity, reserve: Infinity, name: 'PLUMBUM .45', fireRate: 0.22, damage: 24, pellets: 1, spread: 0.006, reloadTime: 0, auto: false },
    }
    this.current = 'shotgun'
    this.time = 0
    this.lastShot = -10
    this.recoil = 0
    this.bobPhase = 0
    this.sway = { x: 0, y: 0 }
    this.reloadT = 0
    this.reloading = false
    this.raise = 1
    this.muzzleT = 0
    this.pumpT = 0
    this.dryT = 0
    this.showWeapon('shotgun', true)
  }

  showWeapon(name, instant = false) {
    for (const [key, w] of Object.entries(this.weapons)) w.group.visible = key === name
    this.raise = instant ? 1 : 0
    this.emitAmmo()
  }

  get weapon() { return this.weapons[this.current] }

  emitAmmo() {
    const w = this.weapon
    this.callbacks.onAmmo?.(w.name, w.clip, w.reserve, w.maxClip, this.current)
  }

  update(dt, look, moving) {
    this.time += dt
    this.recoil = Math.max(0, this.recoil - dt * 7.5)
    this.muzzleT = Math.max(0, this.muzzleT - dt)
    this.pumpT = Math.max(0, this.pumpT - dt)
    this.sway.x += (-(look?.x || 0) * 0.6 - this.sway.x) * Math.min(1, dt * 8)
    this.sway.y += ((look?.y || 0) * 0.6 - this.sway.y) * Math.min(1, dt * 8)
    if (moving) this.bobPhase += dt * 9.5
    this.raise = Math.min(1, this.raise + dt * 3.5)

    if (this.reloading) {
      this.reloadT += dt
      if (this.reloadT >= this.weapon.reloadTime) this.finishReload()
    }

    const w = this.weapon
    const base = w.group.userData.base
    const bobAmp = moving ? 0.018 : 0.004
    const bobX = Math.sin(this.bobPhase) * bobAmp
    const bobY = Math.abs(Math.cos(this.bobPhase)) * bobAmp * 0.8
    let reloadDip = 0
    if (this.reloading) {
      const p = Math.min(1, this.reloadT / w.reloadTime)
      reloadDip = Math.sin(p * Math.PI) * 0.16
    }
    const raiseOffset = (1 - this.raise) * 0.45
    const pumpOffset = this.pumpT > 0 ? Math.sin((1 - this.pumpT / 0.24) * Math.PI) * 0.11 : 0
    w.group.position.set(
      base.x + bobX + this.sway.x * 0.12,
      base.y + bobY + this.sway.y * 0.12 - reloadDip - raiseOffset,
      base.z + this.recoil * 0.13 + pumpOffset,
    )
    w.group.rotation.set(
      this.recoil * 0.24 + this.sway.y * 0.1,
      this.sway.x * 0.16,
      this.reloading ? Math.sin(Math.min(1, this.reloadT / w.reloadTime) * Math.PI) * 0.4 : 0,
    )
    const flash = w.group.userData.flash
    const fl = w.group.userData.flashLight
    flash.material.opacity = this.muzzleT > 0 ? 0.9 : 0
    flash.scale.setScalar(this.muzzleT > 0 ? 0.4 + Math.random() * 0.25 : 0.01)
    fl.intensity = this.muzzleT > 0 ? 12 : 0
  }

  switchWeapon(name) {
    if (name === this.current || this.reloading) return
    this.current = name
    this.showWeapon(name)
    this.callbacks.onSwitch?.(name)
    uiClick()
  }

  toggleWeapon() {
    this.switchWeapon(this.current === 'shotgun' ? 'pistol' : 'shotgun')
  }

  reload() {
    const w = this.weapon
    if (this.reloading || w.clip === Infinity || w.clip >= w.maxClip || w.reserve <= 0) return
    this.reloading = true
    this.reloadT = 0
    sfxReload()
    this.callbacks.onReload?.()
  }

  finishReload() {
    const w = this.weapon
    const need = w.maxClip - w.clip
    const take = Math.min(need, w.reserve)
    w.clip += take
    w.reserve -= take
    this.reloading = false
    this.reloadT = 0
    this.emitAmmo()
  }

  addAmmo(amount) {
    const w = this.weapons.shotgun
    w.reserve = Math.min(96, w.reserve + amount)
    this.emitAmmo()
  }

  reset() {
    const s = this.weapons.shotgun
    s.clip = 8; s.reserve = 32
    this.current = 'shotgun'
    this.reloading = false; this.reloadT = 0
    this.showWeapon('shotgun', true)
    this.emitAmmo()
  }

  tryFire(level) {
    if (this.reloading || this.raise < 0.8) return false
    const w = this.weapon
    if (this.time - this.lastShot < w.fireRate) return false
    if (w.clip <= 0) {
      dryFire()
      this.callbacks.onEmpty?.()
      if (w.reserve > 0) this.reload()
      return false
    }
    this.lastShot = this.time
    if (w.clip !== Infinity) w.clip--
    this.recoil = 1
    this.muzzleT = 0.07
    if (this.current === 'shotgun') {
      sfxShotgun()
      this.pumpT = 0.24
    } else {
      sfxPistol()
    }
    this.emitAmmo()
    this.callbacks.onFire?.(this.current)
    level.playerShoot({
      pellets: w.pellets, damage: w.damage, spread: w.spread, weapon: this.current,
      muzzle: w.group.userData.muzzle.clone(),
    })
    if (w.clip === 0 && w.reserve > 0) this.reload()
    return true
  }

  resize(aspect) {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }

  render(renderer) {
    renderer.clearDepth()
    renderer.render(this.scene, this.camera)
  }
}

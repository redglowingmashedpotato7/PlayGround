import * as THREE from 'three'
import { material, glow } from './art.js'
import { makePlumbob } from './props.js'
import {
  growl, enemyHit, enemyDeath, fireball, hurt,
} from './audio.js'

const HIT_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 })

function limb(group, color, x, y, z, w, h, d, partRef, name) {
  const pivot = new THREE.Group()
  pivot.position.set(x, y, z)
  group.add(pivot)
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, { roughness: 0.9 }))
  m.position.y = -h / 2
  m.castShadow = false
  pivot.add(m)
  partRef[name] = pivot
  return pivot
}

function makeHitbox(group, radius, y, head = false) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), HIT_MAT)
  m.position.y = y
  m.userData.head = head
  m.visible = true
  group.add(m)
  return m
}

function eyes(parent, color, y, z, spread = 0.1, size = 0.045) {
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), material(color, { emissive: color, emissiveIntensity: 2.6, roughness: 0.2 }))
    e.position.set(s * spread, y, z)
    parent.add(e)
    const gl = glow(parent, color, size * 8, s * spread, y, z + 0.02, 0.8)
    gl.userData.eyeGlow = true
  }
}

function buildImp(theme) {
  const group = new THREE.Group()
  const parts = {}
  const skin = theme.enemy ?? 0x8a3524
  const dark = 0x2a1816
  const belly = 0xb66a4a
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), material(skin, { roughness: 0.95 }))
  torso.scale.set(1, 1.2, 0.8); torso.position.y = 1.02
  group.add(torso)
  const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), material(belly, { roughness: 0.95 }))
  bellyMesh.scale.set(1, 1.1, 0.7); bellyMesh.position.set(0, 0.98, 0.18)
  group.add(bellyMesh)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), material(skin, { roughness: 0.9 }))
  head.position.y = 1.58; head.scale.set(1, 1.08, 1.05)
  group.add(head)
  eyes(head, 0xffba3a, 0.02, 0.23, 0.1, 0.043)
  // horns
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 6), material(0x2b1c18, { roughness: 0.8 }))
    horn.position.set(s * 0.18, 1.82, -0.02); horn.rotation.z = s * 0.5
    group.add(horn)
  }
  // teeth
  for (let i = 0; i < 3; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 4), material(0xe8e0c8))
    tooth.position.set(-0.08 + i * 0.08, 1.48, 0.24); tooth.rotation.x = Math.PI
    group.add(tooth)
  }
  limb(group, skin, -0.18, 0.55, 0, 0.16, 0.55, 0.16, parts, 'legL')
  limb(group, skin, 0.18, 0.55, 0, 0.16, 0.55, 0.16, parts, 'legR')
  limb(group, skin, -0.46, 1.3, 0, 0.14, 0.68, 0.14, parts, 'armL')
  limb(group, skin, 0.46, 1.3, 0, 0.14, 0.68, 0.14, parts, 'armR')
  // claws
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.12, 4), material(0xe8d8c0))
      c.position.set(s * 0.46 + (i - 1) * 0.04, 0.62, 0.06); c.rotation.x = Math.PI / 2
      group.add(c)
    }
  }
  // shoulder spikes
  for (const s of [-1, 1]) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 5), material(dark, { roughness: 0.7 }))
    spike.position.set(s * 0.35, 1.35, -0.05); spike.rotation.z = s * 0.6
    group.add(spike)
  }
  const hitBody = makeHitbox(group, 0.58, 1.05)
  const hitHead = makeHitbox(group, 0.34, 1.6, true)
  return { group, parts, hitboxes: [hitBody, hitHead], height: 1.58, torso }
}

function buildBrute(theme) {
  const group = new THREE.Group()
  const parts = {}
  const skin = 0x8a7260
  const dark = 0x3a2a24
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 8), material(skin, { roughness: 0.95 }))
  torso.scale.set(1.15, 1.25, 0.9); torso.position.y = 1.55
  group.add(torso)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), material(0x6a4a3a, { roughness: 0.95 }))
  belly.scale.set(1, 1, 0.6); belly.position.set(0, 1.35, 0.38); group.add(belly)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), material(skin, { roughness: 0.9 }))
  head.position.y = 2.42; head.scale.set(1.05, 0.95, 1)
  group.add(head)
  eyes(head, 0xff2a10, 0.06, 0.3, 0.14, 0.055)
  // jaw
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.3), material(0x3a1a14, { roughness: 0.9 }))
  jaw.position.set(0, 2.22, 0.24); group.add(jaw)
  for (let i = 0; i < 5; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.1, 4), material(0xe8dcc0))
    tooth.position.set(-0.16 + i * 0.08, 2.34, 0.3); tooth.rotation.x = Math.PI
    group.add(tooth)
  }
  // horns
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.7, 7), material(0x2a1c16, { roughness: 0.75 }))
    horn.position.set(s * 0.3, 2.72, -0.02); horn.rotation.z = s * 0.7
    group.add(horn)
  }
  // shoulder plates
  for (const s of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), material(0x5a4a3e, { roughness: 0.8 }))
    sh.scale.set(1, 0.8, 0.9); sh.position.set(s * 0.78, 2.1, 0); group.add(sh)
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 5), material(dark))
    spike.position.set(s * 0.85, 2.4, -0.1); spike.rotation.z = s * 0.7; group.add(spike)
  }
  limb(group, skin, -0.3, 0.95, 0, 0.26, 0.95, 0.26, parts, 'legL')
  limb(group, skin, 0.3, 0.95, 0, 0.26, 0.95, 0.26, parts, 'legR')
  limb(group, 0x7a6252, -0.88, 2.15, 0, 0.27, 1.15, 0.27, parts, 'armL')
  limb(group, 0x7a6252, 0.88, 2.15, 0, 0.27, 1.15, 0.27, parts, 'armR')
  for (const s of [-1, 1]) {
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), material(0x6a5244))
    fist.position.set(s * 0.88, 1.0, 0.05); group.add(fist)
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 4), material(0xe0d4b8))
      c.position.set(s * 0.88 + (i - 1) * 0.08, 0.82, 0.16); c.rotation.x = Math.PI / 2
      group.add(c)
    }
  }
  const hitBody = makeHitbox(group, 0.85, 1.6)
  const hitHead = makeHitbox(group, 0.45, 2.42, true)
  return { group, parts, hitboxes: [hitBody, hitHead], height: 2.4, torso }
}

function buildFloater(theme) {
  const group = new THREE.Group()
  const parts = {}
  const body = new THREE.Group(); body.position.y = 1.9; group.add(body)
  const skin = 0x6a3a4a
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 12), material(skin, { roughness: 0.85 }))
  orb.scale.set(1, 0.92, 1); body.add(orb)
  const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), material(0xe8e2cc, { roughness: 0.5 }))
  eyeWhite.position.set(0, 0.12, 0.55); eyeWhite.scale.set(1, 0.95, 0.6); body.add(eyeWhite)
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), material(0xff7a2a, { emissive: 0xff3a10, emissiveIntensity: 1.8 }))
  iris.position.set(0, 0.12, 0.72); body.add(iris)
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), material(0x0a0606, { roughness: 0.2 }))
  pupil.position.set(0, 0.12, 0.82); body.add(pupil)
  glow(body, 0xff5a2a, 1.0, 0, 0.12, 0.86, 0.35)
  // mouth
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 6, 18, Math.PI), material(0x2a0808))
  mouth.position.set(0, -0.28, 0.58); mouth.rotation.z = Math.PI; body.add(mouth)
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 4), material(0xe8dcc0))
    t.position.set(-0.22 + i * 0.088, -0.27, 0.66); t.rotation.x = Math.PI; body.add(t)
  }
  // spikes
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38 + (i % 2) * 0.15, 5), material(0x2a1418))
    spike.position.set(Math.cos(a) * 0.62, -0.1 + Math.sin(a) * 0.5, Math.sin(a) * 0.2)
    spike.rotation.z = Math.PI / 2 - a; spike.rotation.x = 0.4
    body.add(spike)
  }
  // tendrils
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Group(); t.position.set(-0.3 + i * 0.3, 1.75, 0); group.add(t)
    for (let s = 0; s < 3; s++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.04 - s * 0.008, 0.05 - s * 0.008, 0.32, 6), material(0x4a2632))
      seg.position.y = -0.16 - s * 0.28; t.add(seg)
    }
    t.userData.tendril = i
    parts['tendril' + i] = t
  }
  const hitBody = makeHitbox(group, 0.75, 1.9)
  return { group, parts, hitboxes: [hitBody], height: 1.9, body, hover: true }
}

function buildGnome(theme) {
  const group = new THREE.Group()
  const parts = {}
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 8), material(0xb01a1a, { roughness: 0.85 }))
  hat.position.y = 1.25; group.add(hat)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), material(0xe0a882, { roughness: 0.9 }))
  head.position.y = 1.02; group.add(head)
  eyes(head, 0xff3010, 0.02, 0.19, 0.075, 0.032)
  // beard
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 7), material(0xe8e4d8, { roughness: 0.95 }))
  beard.position.set(0, 0.8, 0.1); beard.rotation.x = Math.PI; group.add(beard)
  // body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 9, 7), material(0x2a4a8a, { roughness: 0.9 }))
  body.scale.set(1, 1.35, 0.85); body.position.y = 0.52; group.add(body)
  // belt
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.3), material(0x1a1614))
  belt.position.y = 0.48; group.add(belt)
  limb(group, 0x2a4a8a, -0.3, 0.5, 0, 0.09, 0.35, 0.09, parts, 'armL')
  limb(group, 0x2a4a8a, 0.3, 0.5, 0, 0.09, 0.35, 0.09, parts, 'armR')
  limb(group, 0x1a1614, -0.11, 0.28, 0, 0.1, 0.28, 0.1, parts, 'legL')
  limb(group, 0x1a1614, 0.11, 0.28, 0, 0.1, 0.28, 0.1, parts, 'legR')
  // pitchfork
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), material(0x6a4a2a))
  shaft.position.set(0.44, 0.7, 0.1); shaft.rotation.z = -0.12; group.add(shaft)
  for (let i = 0; i < 3; i++) {
    const prong = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.18, 4), material(0x9a9a90, { metalness: 0.6, roughness: 0.35 }))
    prong.position.set(0.36 + i * 0.08, 1.18, 0.1); group.add(prong)
  }
  const hitBody = makeHitbox(group, 0.38, 0.72)
  const hitHead = makeHitbox(group, 0.27, 1.1, true)
  return { group, parts, hitboxes: [hitBody, hitHead], height: 1.05 }
}

function buildBoss(theme) {
  const group = new THREE.Group()
  const parts = {}
  const skin = 0x5a1a24
  const armor = 0x2a2024
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 10), material(skin, { roughness: 0.9 }))
  torso.scale.set(1.2, 1.25, 0.9); torso.position.y = 2.3; group.add(torso)
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.25), material(armor, { roughness: 0.5, metalness: 0.3 }))
  chest.position.set(0, 2.4, 0.82); group.add(chest)
  const sigil = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), material(0xff2a4a, { emissive: 0xff1a3a, emissiveIntensity: 2.4 }))
  sigil.position.set(0, 2.42, 0.98); group.add(sigil)
  glow(group, 0xff2a4a, 1.6, 0, 2.4, 1.0, 0.5)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), material(0x6a2028, { roughness: 0.9 }))
  head.position.y = 3.55; head.scale.set(1, 1.02, 1); group.add(head)
  eyes(head, 0xffd040, 0.06, 0.45, 0.18, 0.075)
  // crown
  const crown = new THREE.Group(); crown.position.y = 4.02; group.add(crown)
  cylinder(crown, 0xd4a030, 0.42, 0.18, 0, 0, 0)
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.36, 5), material(0xd4a030, { metalness: 0.6, roughness: 0.35, emissive: 0x4a2a00, emissiveIntensity: 0.4 }))
    spike.position.set(Math.cos(a) * 0.38, 0.24, Math.sin(a) * 0.38); crown.add(spike)
  }
  // horns
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.2, 8), material(0x1a1014, { roughness: 0.7 }))
    horn.position.set(s * 0.5, 3.9, -0.1); horn.rotation.z = s * 0.65; group.add(horn)
  }
  // cape
  const capeGeo = new THREE.PlaneGeometry(2.7, 3.4, 4, 4)
  const capeMat = new THREE.MeshStandardMaterial({ color: 0x3a0710, roughness: 0.95, side: THREE.DoubleSide })
  const cape = new THREE.Mesh(capeGeo, capeMat)
  cape.position.set(0, 2.2, -0.95); cape.rotation.x = 0.08
  group.add(cape)
  // shoulders
  for (const s of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), material(armor, { roughness: 0.5, metalness: 0.35 }))
    sh.scale.set(1, 0.8, 0.9); sh.position.set(s * 1.15, 3.1, 0); group.add(sh)
    for (let i = 0; i < 2; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 5), material(0x1a1014))
      sp.position.set(s * (1.35 + i * 0.15), 3.45, -0.1); sp.rotation.z = s * (0.5 + i * 0.2); group.add(sp)
    }
  }
  limb(group, skin, -0.42, 1.5, 0, 0.38, 1.4, 0.38, parts, 'legL')
  limb(group, skin, 0.42, 1.5, 0, 0.38, 1.4, 0.38, parts, 'legR')
  limb(group, 0x6a2028, -1.35, 3.0, 0, 0.34, 1.6, 0.34, parts, 'armL')
  limb(group, 0x6a2028, 1.35, 3.0, 0, 0.34, 1.6, 0.34, parts, 'armR')
  for (const s of [-1, 1]) {
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), material(0x5a1a24))
    fist.position.set(s * 1.35, 1.42, 0.1); group.add(fist)
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 4), material(0xe8dcc0))
      c.position.set(s * 1.35 + (i - 1) * 0.1, 1.18, 0.24); c.rotation.x = Math.PI / 2; group.add(c)
    }
  }
  const hitBody = makeHitbox(group, 1.25, 2.35)
  const hitHead = makeHitbox(group, 0.65, 3.55, true)
  return { group, parts, hitboxes: [hitBody, hitHead], height: 3.6, hover: false, cape }
}

const STATS = {
  imp: { hp: 58, speed: 2.05, radius: 0.45, damage: 11, reach: 1.4, ranged: true, attackCd: 2.0, aggro: 17 },
  brute: { hp: 175, speed: 1.6, radius: 0.72, damage: 19, reach: 2.3, ranged: false, attackCd: 1.3, aggro: 19 },
  floater: { hp: 84, speed: 1.35, radius: 0.58, damage: 13, reach: 1.6, ranged: true, attackCd: 2.4, aggro: 18 },
  gnome: { hp: 34, speed: 3.05, radius: 0.32, damage: 7, reach: 1.2, ranged: false, attackCd: 0.9, aggro: 16 },
  boss: { hp: 1150, speed: 1.5, radius: 1.15, damage: 22, reach: 3.2, ranged: true, attackCd: 1.6, aggro: 30 },
}

export class Enemy {
  constructor(type, x, z, theme, difficulty = 1) {
    this.type = type
    const stats = STATS[type] || STATS.imp
    this.stats = stats
    this.maxHp = Math.round(stats.hp * (1 + (difficulty - 1) * 0.16))
    this.hp = this.maxHp
    this.radius = stats.radius
    this.speed = stats.speed
    this.damage = stats.damage
    this.reach = stats.reach
    this.ranged = stats.ranged
    this.attackCd = stats.attackCd
    this.aggroRange = stats.aggro
    this.dead = false
    this.deadTimer = 0
    this.phase = Math.random() * 10
    this.attackTimer = 0.5 + Math.random() * 0.9
    this.windup = 0
    this.hurtTimer = 0
    this.alertTimer = 0
    this.spawnTimer = 0.5
    this.chargeTimer = 0
    this.enraged = false
    this.growlTimer = 3 + Math.random() * 5
    this.shockTimer = 0
    this.position = new THREE.Vector3(x, 0, z)
    const built = type === 'brute' ? buildBrute(theme)
      : type === 'floater' ? buildFloater(theme)
        : type === 'gnome' ? buildGnome(theme)
          : type === 'boss' ? buildBoss(theme)
            : buildImp(theme)
    this.group = built.group
    this.parts = built.parts
    this.hitboxes = built.hitboxes
    this.height = built.height
    this.hover = built.hover
    this.body = built.body
    this.baseScale = type === 'boss' ? 0.86 : 1
    this.baseY = this.hover ? 0.0 : 0
    this.group.position.set(x, 0, z)
    this.group.rotation.y = Math.random() * 6.28
    this.spawnRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.2, 24), new THREE.MeshBasicMaterial({ color: theme.accent ?? 0xff5a24, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))
    this.spawnRing.rotation.x = -Math.PI / 2; this.spawnRing.position.y = 0.06
    this.group.add(this.spawnRing)
    this.flash = glow(this.group, 0xffffff, 1.8, 0, this.hover ? 1.9 : this.height * 0.65, 0, 0)
    this.hitboxes.forEach(h => { h.userData.enemy = this })
    this.group.scale.setScalar(0.01)
    this.group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false } })
  }

  alert() { this.alertTimer = 14 }

  update(dt, ctx) {
    this.phase += dt
    const dist = Math.hypot(ctx.player.x - this.position.x, ctx.player.z - this.position.z)
    this.spawnTimer = Math.max(0, this.spawnTimer - dt)
    if (this.spawnTimer > 0) {
      const p = 1 - this.spawnTimer / 0.5
      this.group.scale.setScalar(Math.max(0.01, p * p) * this.baseScale)
      this.spawnRing.material.opacity = 0.6 * (1 - p)
      this.spawnRing.scale.setScalar(1 + p * 1.6)
    } else {
      this.group.scale.setScalar(this.baseScale)
      this.spawnRing.visible = false
    }

    if (this.dead) {
      this.deadTimer += dt
      const p = Math.min(1, this.deadTimer / 0.55)
      this.group.rotation.x = -p * Math.PI / 2
      this.group.position.y = -Math.max(0, this.deadTimer - 1.2) * 0.4
      if (this.deadTimer > 2.2) this.group.visible = false
      return
    }
    if (this.spawnTimer > 0) return

    this.hurtTimer = Math.max(0, this.hurtTimer - dt)
    this.flash.material.opacity = this.hurtTimer > 0 ? this.hurtTimer * 2.2 : 0
    this.attackTimer -= dt
    this.windup = Math.max(0, this.windup - dt)
    this.alertTimer = Math.max(0, this.alertTimer - dt)
    this.growlTimer -= dt
    this.chargeTimer = Math.max(0, this.chargeTimer - dt)
    this.shockTimer = Math.max(0, this.shockTimer - dt)

    const dx = ctx.player.x - this.position.x
    const dz = ctx.player.z - this.position.z
    const distNow = Math.hypot(dx, dz)
    const hasLos = ctx.losClear(this.position.x, this.position.z, ctx.player.x, ctx.player.z)
    const aggro = this.alertTimer > 0 || (distNow < this.aggroRange && hasLos) || distNow < 4 || this.hp < this.maxHp
    this.aggro = aggro

    if (aggro && hasLos) this.alertTimer = Math.max(this.alertTimer, 10)

    if (this.type === 'boss' && !this.enraged && this.hp < this.maxHp * 0.5) {
      this.enraged = true
      this.speed *= 1.3
      this.attackCd *= 0.7
      ctx.onBossEnrage?.(this)
    }

    if (!aggro) {
      // idle sway
      this.group.rotation.y += Math.sin(this.phase * 0.7) * dt * 0.4
      this.animate(dt, 0, false)
      return
    }

    // face player
    const targetRot = Math.atan2(dx, dz)
    let diff = targetRot - this.group.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    this.group.rotation.y += diff * Math.min(1, dt * 7)

    if (this.growlTimer <= 0) {
      this.growlTimer = 5 + Math.random() * 7
      if (Math.random() < 0.55) growl()
    }

    let moving = 0
    const tooClose = distNow < 1.4
    const desiredDist = this.ranged ? (this.type === 'boss' ? 5 : 6.2) : this.reach * 0.7
    if (this.windup <= 0 && this.shockTimer <= 0) {
      if (distNow > desiredDist || !hasLos) {
        let speed = this.speed
        if (this.type === 'brute' && distNow < 7 && distNow > 3 && this.chargeTimer <= 0) {
          this.chargeTimer = 0.9
          ctx.onCharge?.(this)
        }
        if (this.chargeTimer > 0) speed = this.speed * 2.5
        const inv = 1 / Math.max(0.001, distNow)
        const vx = dx * inv * speed * dt
        const vz = dz * inv * speed * dt
        const nx = this.position.x + vx
        const nz = this.position.z + vz
        if (!ctx.collides(nx, this.position.z, this.radius)) this.position.x = nx
        else if (!ctx.collides(this.position.x, this.position.z + vz, this.radius)) this.position.z += vz
        if (!ctx.collides(this.position.x, nz, this.radius)) this.position.z = nz
        else if (!ctx.collides(nx, this.position.z, this.radius)) this.position.x = nx
        moving = 1
      } else if (distNow < desiredDist && this.ranged && !tooClose) {
        // strafe slowly
        const side = Math.sin(this.phase * 0.7) > 0 ? 1 : -1
        const vx = -dz / Math.max(0.01, distNow) * this.speed * 0.3 * dt * side
        const vz = dx / Math.max(0.01, distNow) * this.speed * 0.3 * dt * side
        if (!ctx.collides(this.position.x + vx, this.position.z, this.radius)) this.position.x += vx
        if (!ctx.collides(this.position.x, this.position.z + vz, this.radius)) this.position.z += vz
        moving = 0.4
      }
    }

    // attacks
    if (this.type === 'boss') {
      if (hasLos && distNow < 14 && this.attackTimer <= 0 && this.windup <= 0) {
        this.windup = 0.6
        this.attackTimer = this.enraged ? 1.7 : 2.4
        ctx.onWindup?.(this)
        this._bossAttack = true
      }
      if (this.windup <= 0 && this._bossAttack) {
        this._bossAttack = false
        const base = Math.atan2(dx, dz)
        for (const off of [-0.16, 0, 0.16]) {
          ctx.spawnProjectile(
            { x: this.position.x + Math.sin(base + off) * 0.9, y: 2.4, z: this.position.z + Math.cos(base + off) * 0.9 },
            { x: ctx.player.x + Math.sin(base + off) * 3, y: 1.2, z: ctx.player.z + Math.cos(base + off) * 3 },
            { speed: 7.2, damage: this.damage, color: 0xff2a4a, radius: 0.34 },
          )
        }
        fireball()
      }
      if (distNow < 4.2 && this.shockTimer <= 0) {
        this.shockTimer = 4.2
        ctx.onShockwave?.(this)
        if (distNow < 3.4) ctx.damagePlayer(this.damage, this)
      }
    } else if (this.ranged) {
      if (hasLos && distNow < 13 && this.attackTimer <= 0 && this.windup <= 0) {
        this.windup = 0.42
        this.attackTimer = this.attackCd * (0.85 + Math.random() * 0.4)
        this._rangedAttack = true
        this.group.scale.setScalar(1.08 * this.baseScale)
      }
      if (this.windup <= 0 && this._rangedAttack) {
        this._rangedAttack = false
        const from = { x: this.position.x, y: this.hover ? 1.9 : this.type === 'imp' ? 1.5 : 2.4, z: this.position.z }
        const to = { x: ctx.player.x, y: 1.15, z: ctx.player.z }
        ctx.spawnProjectile(from, to, { speed: this.type === 'floater' ? 6.2 : 7.0, damage: this.damage, color: this.type === 'floater' ? 0x7aff6a : 0xff7a2a, radius: this.type === 'floater' ? 0.25 : 0.22 })
        fireball()
        this.group.scale.setScalar(this.baseScale)
      }
    } else {
      if (distNow < this.reach && this.attackTimer <= 0 && this.windup <= 0) {
        this.windup = 0.3
        this.attackTimer = this.attackCd
        this._meleeAttack = true
      }
      if (this.windup <= 0 && this._meleeAttack) {
        this._meleeAttack = false
        if (distNow < this.reach + 0.5) {
          ctx.damagePlayer(this.damage, this)
          ctx.onMelee?.(this)
        }
      }
    }

    this.animate(dt, moving, aggro)
  }

  animate(dt, moving, aggro) {
    const p = this.parts
    const speed = this.type === 'gnome' ? 13 : this.type === 'boss' ? 5 : 8
    const swing = moving ? Math.sin(this.phase * speed) * 0.55 : Math.sin(this.phase * 2) * 0.08
    if (p.legL) p.legL.rotation.x = swing
    if (p.legR) p.legR.rotation.x = -swing
    if (p.armL) p.armL.rotation.x = -swing * 0.7
    if (p.armR) p.armR.rotation.x = swing * 0.7
    if (this.windup > 0 || this._rangedAttack) {
      if (p.armL) p.armL.rotation.x = -1.5
      if (p.armR) p.armR.rotation.x = -1.5
    }
    if (this.hover) {
      this.group.position.y = Math.sin(this.phase * 1.6) * 0.18
      if (this.body) this.body.rotation.y += dt * 0.4
      for (let i = 0; i < 3; i++) {
        const t = p['tendril' + i]
        if (t) t.rotation.z = Math.sin(this.phase * 2 + i) * 0.18
      }
    } else {
      this.group.position.y = Math.abs(Math.sin(this.phase * speed * 0.5)) * 0.03
    }
    if (this.type === 'boss' && this.cape) this.cape.rotation.x = 0.08 + Math.sin(this.phase * 1.8) * 0.05

    // keep hitbox position in sync with hover
    this.group.position.x = this.position.x
    this.group.position.z = this.position.z
  }

  hit(amount, head, point, ctx) {
    if (this.dead) return 0
    const dmg = Math.round(amount * (head ? 2 : 1))
    this.hp -= dmg
    this.hurtTimer = 0.12
    this.alertTimer = 12
    ctx.onHit?.(this, dmg, head, point)
    if (this.hp <= 0) {
      this.die(ctx)
      return dmg
    }
    // slight knockback
    if (point) {
      const dx = this.position.x - point.x, dz = this.position.z - point.z
      const d = Math.hypot(dx, dz) || 1
      const nx = this.position.x + dx / d * 0.08
      const nz = this.position.z + dz / d * 0.08
      if (!ctx.collides(nx, this.position.z, this.radius)) this.position.x = nx
      if (!ctx.collides(this.position.x, nz, this.radius)) this.position.z = nz
    }
    return dmg
  }

  die(ctx) {
    this.dead = true
    this.deadTimer = 0
    this.hitboxes.forEach(h => { h.userData.enemy = null; h.visible = false; h.layers.disableAll() })
    enemyDeath()
    ctx.onDeath?.(this)
  }

  dispose() {
    this.group.traverse(o => {
      if (o.isMesh) { o.geometry?.dispose?.() }
    })
  }
}

export function enemyStats(type) { return STATS[type] || STATS.imp }

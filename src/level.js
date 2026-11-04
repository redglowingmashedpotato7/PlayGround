import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  box, cylinder, sphere, cone, torus, plane, glow, material, basicMaterial, light,
  texturedBox, disposeObject, G,
} from './art.js'
import {
  wallpaper, floorTexture, ceilingTexture, paintingTexture, windowTexture,
  bloodTexture, bulletTexture, flameTexture, glowTexture, starfieldTexture,
} from './textures.js'
import { makeProp, makePlumbob } from './props.js'
import { Enemy } from './enemies.js'
import { WeaponSystem } from './weapons.js'
import { tileToWorld, TILE, buildGrid, LEVELS } from './levels.js'
import {
  soul as sfxSoul, pickup as sfxPickup, hurt as sfxHurt, portalOpen, portalEnter,
  win as sfxWin, death as sfxDeath, enemyHit as sfxEnemyHit, footstep, fireball,
} from './audio.js'

const H = 4.25
const P = 1.65
const PLAYER_R = 0.4

const SOLID_PROPS = {
  sofa: 1.15, armchair: 0.65, coffeeTable: 1.0, bookshelf: 0.75, fireplace: 1.2,
  tv: 0.9, diningTable: 1.35, chair: 0.3, sideboard: 0.95, kitchenCounter: 1.5,
  islandCounter: 1.0, fridge: 0.55, stove: 0.55, bar: 1.25, poolTable: 1.45,
  bed: 1.5, wardrobe: 1.0, dresser: 0.9, poolTable: 1.45, crates: 0.85,
  barrel: 0.42, statue: 0.55, washer: 0.6, mudBench: 1.25, treadmill: 0.9,
  benchPress: 0.85, theaterRow: 1.2, serverRack: 0.55, throne: 1.1, piano: 1.2,
  grandfatherClock: 0.5, altar: 1.05, pewRow: 1.4, screen: 1.0, slimePit: 2.6,
  lavaPit: 2.6,
}

function hashRandom(seed) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

function portalShader() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uActive: { value: 0 },
      uColor: { value: new THREE.Color(0xb8ff3d) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform float uActive; uniform vec3 uColor;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 p=vUv*2.0-1.0; float r=length(p); float a=atan(p.y,p.x);
        float swirl=sin(a*4.0+r*14.0-uTime*3.5)*0.5+0.5;
        float n=noise(p*4.0+vec2(uTime*.4,-uTime*.3));
        float glow=exp(-r*2.2);
        vec3 col=uColor*(0.35+swirl*0.5+n*0.35)*glow*(0.35+uActive*0.9);
        float edge=smoothstep(1.02,0.84,r);
        float inner=smoothstep(0.05,0.22,r);
        col*=edge*inner;
        gl_FragColor=vec4(col,clamp(glow*0.85,0.0,1.0)*uActive*0.92);
      }`,
  })
}

export class Level {
  constructor(spec, callbacks = {}) {
    this.spec = spec
    this.cb = callbacks
    this.theme = spec.theme
    this.grid = buildGrid(spec)
    this.events = []
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(this.theme.fog, this.theme.fogDensity)
    this.scene.background = new THREE.Color(this.theme.fog)
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.04, 140)
    this.camera.rotation.order = 'YXZ'
    this.camera.position.set(0, P, 0)
    this.raycaster = new THREE.Raycaster()
    this.time = 0
    this.hudTick = 0
    this.stats = { shots: 0, hits: 0 }
    this.souls = 0
    this.kills = 0
    this.totalKills = spec.enemies.length
    this.won = false
    this.dead = false
    this.portalOpen = false
    this.nearExit = false
    this.subtitleText = ''
    this.subtitleTimer = 0
    this.introTimer = 0
    this.dust = []
    this.embers = []
    this.decals = []
    this.particles = []
    this.projectiles = []
    this.shockwaves = []
    this.pickups = []
    this.propUpdates = []
    this.animatables = []
    this.orbiters = []
    this.shake = 0
    this.kick = 0
    this.bobPhase = 0
    this.stepTimer = 0
    this.lookDelta = { x: 0, y: 0 }
    this.input = { forward: 0, back: 0, left: 0, right: 0, sprint: false, touchX: 0, touchY: 0 }
    this.staticTargets = []
    this.enemyGroups = []
    this.blockers = []
    this.deadEnemies = []
    this.pickupDropCooldown = 0

    this.build()
    this.weapons = new WeaponSystem({
      onAmmo: () => { this.hudTick = 99 },
      onFire: () => { this.alertEnemies() },
      onReload: () => { this.events.push({ type: 'toast', text: 'Reloading. The suspense is killer.', kind: 'doom' }) },
      onEmpty: () => { this.events.push({ type: 'toast', text: 'Empty. Find shells or switch to the pistol.', kind: 'doom' }) },
    })
    this.weapons.resize(window.innerWidth / window.innerHeight)
    this.hud = this.makeHud()
    this.introTimer = 2.2
    this.subtitle('The front door locks behind you. This is, legally, an open house.')
  }

  /* ------------------------------------------------------------------ */
  /* Build                                                              */
  /* ------------------------------------------------------------------ */

  build() {
    const t = this.theme
    this.scene.add(new THREE.AmbientLight(t.ambient, t.ambientIntensity))
    const hemi = new THREE.HemisphereLight(t.hemiSky, t.hemiGround, t.hemiIntensity)
    this.scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffe0c0, 0.55)
    dir.position.set(10, 20, 6)
    this.scene.add(dir)

    this.buildFloors()
    this.buildWalls()
    this.buildCeiling()
    this.buildRoomLights()
    this.buildProps()
    this.buildWallDecor()
    this.buildPortal()
    this.buildOrbs()
    this.buildEnemies()
    this.buildAtmosphere()
    this.buildPlayer()

    this.playerLight = new THREE.PointLight(0xffd0a0, 3.2, 10, 2)
    this.scene.add(this.playerLight)
  }

  buildFloors() {
    const S = 27 * TILE
    const baseTex = floorTexture('wood').clone(); baseTex.repeat.set(10, 10); baseTex.needsUpdate = true
    const baseMat = new THREE.MeshStandardMaterial({ map: baseTex, roughness: 0.88, color: 0xb8b4a0 })
    const base = new THREE.Mesh(new THREE.PlaneGeometry(S, S), baseMat)
    base.rotation.x = -Math.PI / 2
    base.position.y = 0
    base.receiveShadow = true
    this.scene.add(base)
    this.staticTargets.push(base)

    for (const room of this.spec.rooms) {
      const tex = floorTexture(room.floor).clone()
      tex.repeat.set(Math.max(2, room.w * 0.55), Math.max(2, room.d * 0.55))
      tex.needsUpdate = true
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: room.floor === 'marble' ? 0.35 : 0.88, metalness: room.floor === 'marble' ? 0.08 : 0 })
      const cx = (room.x + room.w / 2 - 13.5) * TILE
      const cz = (room.z + room.d / 2 - 13.5) * TILE
      const m = new THREE.Mesh(new THREE.PlaneGeometry(room.w * TILE, room.d * TILE), mat)
      m.rotation.x = -Math.PI / 2
      m.position.set(cx, 0.012, cz)
      m.receiveShadow = true
      this.scene.add(m)
      this.staticTargets.push(m)
      // subtle room border trim
      const trim = new THREE.Mesh(new THREE.PlaneGeometry(room.w * TILE - 0.2, 0.12), new THREE.MeshStandardMaterial({ color: 0x2a1e14, roughness: 0.7 }))
      trim.rotation.x = -Math.PI / 2
      trim.position.set(cx, 0.02, cz + room.d * TILE / 2 - 0.1)
      this.scene.add(trim)
    }
  }

  buildWalls() {
    const variants = new Map()
    const baseGeos = new Map()
    const floorSet = new Set()
    for (let z = 0; z < 27; z++) for (let x = 0; x < 27; x++) if (this.grid[z][x] === 0) floorSet.add(x + ',' + z)
    const roomAt = (x, z) => this.spec.rooms.find(r => x >= r.x && x < r.x + r.w && z >= r.z && z < r.z + r.d)
    const dirs = [[0, -1, 0, -1], [0, 1, 0, 1], [-1, 0, -1, 0], [1, 0, 1, 0]]
    let wallCount = 0
    for (let z = 0; z < 27; z++) for (let x = 0; x < 27; x++) {
      if (this.grid[z][x] !== 1) continue
      let exposed = false
      for (const [dx, , dz] of dirs) if (floorSet.has((x + dx) + ',' + (z + dz))) { exposed = true; break }
      if (!exposed) continue
      wallCount++
      let variant = 0
      let seedRoom = null
      for (const [dx, , dz] of dirs) {
        const room = roomAt(x + dx, z + dz)
        if (room) { seedRoom = room; break }
      }
      if (seedRoom) {
        const k = seedRoom.kind
        variant = (k === 'kitchen' || k === 'pool' || k === 'laundry' || k === 'mudroom' || k === 'gym' || k === 'exitroom' || k === 'storage') ? 1
          : (k === 'arcade' || k === 'rec' || k === 'theater' || k === 'vip' || k === 'ballroom') ? 2 : 0
      }
      const geo = new THREE.BoxGeometry(TILE, H, TILE)
      const cx = (x + 0.5 - 13.5) * TILE
      const cz = (z + 0.5 - 13.5) * TILE
      geo.translate(cx, H / 2, cz)
      if (!baseGeos.has(variant)) baseGeos.set(variant, [])
      baseGeos.get(variant).push(geo)

      // trims on exposed faces
      for (const [dx, , dz] of dirs) {
        if (!floorSet.has((x + dx) + ',' + (z + dz))) continue
        const nx = dx, nz = dz
        const bx = cx + nx * (TILE / 2 + 0.008)
        const bz = cz + nz * (TILE / 2 + 0.008)
        const bw = nx !== 0 ? 0.045 : TILE
        const bd = nz !== 0 ? 0.045 : TILE
        const trimGeo = new THREE.BoxGeometry(bw, 0.16, bd)
        trimGeo.translate(bx, 0.09, bz)
        if (!variants.has('base')) variants.set('base', [])
        variants.get('base').push(trimGeo)
        const crownGeo = new THREE.BoxGeometry(bw, 0.1, bd)
        crownGeo.translate(bx, H - 0.16, bz)
        if (!variants.has('crown')) variants.set('crown', [])
        variants.get('crown').push(crownGeo)
      }
    }

    for (const [variant, geos] of baseGeos) {
      const tex = wallpaper(this.theme.wallTheme, variant)
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0 })
      const merged = mergeGeometries(geos, false)
      geos.forEach(g => g.dispose())
      const mesh = new THREE.Mesh(merged, mat)
      mesh.receiveShadow = true
      this.scene.add(mesh)
      this.staticTargets.push(mesh)
    }
    const baseMat = material(0x2a1c12, { roughness: 0.8 })
    const crownMat = material(0x3a2c20, { roughness: 0.7 })
    for (const [kind, geos] of variants) {
      const merged = mergeGeometries(geos, false)
      geos.forEach(g => g.dispose())
      const mesh = new THREE.Mesh(merged, kind === 'base' ? baseMat : crownMat)
      this.scene.add(mesh)
      this.staticTargets.push(mesh)
    }
    this.wallCount = wallCount
  }

  buildCeiling() {
    const S = 27 * TILE
    const tex = ceilingTexture().clone(); tex.repeat.set(12, 12); tex.needsUpdate = true
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, color: this.theme.key === 'marble' ? 0x6a6068 : 0xb8b0a0 })
    const m = new THREE.Mesh(new THREE.PlaneGeometry(S, S), mat)
    m.rotation.x = Math.PI / 2
    m.position.y = H
    this.scene.add(m)
    this.staticTargets.push(m)
    // beams
    for (let i = 1; i < 7; i++) {
      const beam = box(this.scene, this.theme.key === 'marble' ? 0x2a242c : 0x4a3422, S, 0.22, 0.24, 0, H - 0.12, (i - 3.5) * 8, { roughness: 0.8 })
      this.staticTargets.push(beam)
    }
  }

  buildRoomLights() {
    for (const room of this.spec.rooms) {
      const cx = (room.x + room.w / 2 - 13.5) * TILE
      const cz = (room.z + room.d / 2 - 13.5) * TILE
      const color = room.light ?? 0xffb46a
      const l = new THREE.PointLight(color, room.kind === 'throne' ? 8.5 : 5.4, Math.max(room.w, room.d) * TILE * 0.95, 2)
      l.position.set(cx, H - 0.5, cz)
      this.scene.add(l)
      // ceiling fixture
      const fixtureMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false })
      const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.07, 12), fixtureMat)
      fixture.position.set(cx, H - 0.08, cz)
      this.scene.add(fixture)
      glow(this.scene, color, 2.8, cx, H - 0.22, cz, 0.17)
      if (room.kind !== 'hall' && room.kind !== 'foyer') {
        const coneMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.018, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
        const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, H - 0.6, 18, 1, true), coneMat)
        cone.position.set(cx, (H - 0.6) / 2, cz)
        cone.rotation.x = Math.PI
        this.scene.add(cone)
      }
    }
  }

  buildProps() {
    const rand = hashRandom(1000 + this.spec.index * 37)
    for (const p of this.spec.props) {
      const g = makeProp(p.type, { ...p, theme: this.theme })
      const w = tileToWorld(p.x, p.z)
      g.position.set(w.x, p.y ?? 0, w.z)
      g.rotation.y = p.rot ?? 0
      if (p.y) g.position.y = p.y
      this.scene.add(g)
      if (g.userData.update) this.propUpdates.push(g.userData.update)
      this.staticTargets.push(g)
      const solidRadius = SOLID_PROPS[p.type]
      if (solidRadius) {
        if (!this.blockers.some(b => Math.hypot(b.x - w.x, b.z - w.z) < 0.4 && (p.type.includes('Pit')))) {
          this.blockers.push({ x: w.x, z: w.z, r: solidRadius })
        }
      }
      if (p.type === 'chandelier' || p.type === 'ceilingFan') {
        g.traverse(o => { if (o.isSprite) this.orbiters.push(o) })
      }
    }
  }

  buildWallDecor() {
    const rand = hashRandom(3000 + this.spec.index * 53)
    const dirs = [[0, -1, 0, -1], [0, 1, 0, 1], [-1, 0, -1, 0], [1, 0, 1, 0]]
    const floorSet = new Set()
    for (let z = 0; z < 27; z++) for (let x = 0; x < 27; x++) if (this.grid[z][x] === 0) floorSet.add(x + ',' + z)
    const roomAt = (x, z) => this.spec.rooms.find(r => x >= r.x && x < r.x + r.w && z >= r.z && z < r.z + r.d)
    const facesByRoom = new Map()
    for (const [key] of floorSet) {
      const [fx, fz] = key.split(',').map(Number)
      const room = roomAt(fx, fz)
      if (!room) continue
      for (const [dx, , dz] of dirs) {
        const wx = fx + dx, wz = fz + dz
        if (wx < 0 || wx >= 27 || wz < 0 || wz >= 27) continue
        if (this.grid[wz][wx] !== 1) continue
        // normal points from wall toward the floor tile
        const nx = -dx, nz = -dz
        const face = {
          x: (wx + 0.5 - 13.5) * TILE + nx * (TILE / 2 + 0.012),
          z: (wz + 0.5 - 13.5) * TILE + nz * (TILE / 2 + 0.012),
          yaw: nz > 0 ? 0 : nz < 0 ? Math.PI : nx > 0 ? Math.PI / 2 : -Math.PI / 2,
          nx, nz,
        }
        if (!facesByRoom.has(room)) facesByRoom.set(room, [])
        facesByRoom.get(room).push(face)
      }
    }

    let paintIndex = 0
    for (const [room, faces] of facesByRoom) {
      const shuffled = faces.slice().sort(() => rand() - 0.5)
      const used = []
      const tooClose = (f) => used.some(u => Math.hypot(u.x - f.x, u.z - f.z) < 1.6)
      const pick = () => {
        for (const f of shuffled) { if (!tooClose(f)) { used.push(f); return f } }
        return null
      }
      // window
      if (rand() > 0.35) {
        const f = pick()
        if (f) {
          const w = 1.85, h = 1.45
          box(this.scene, 0x2a1e14, f.nx !== 0 ? 0.07 : w + 0.22, h + 0.22, f.nz !== 0 ? 0.07 : w + 0.22, f.x - f.nx * 0.015, 2.1, f.z - f.nz * 0.015, { rotY: f.yaw, roughness: 0.6 })
          const winTex = windowTexture(this.theme.key)
          const mat = new THREE.MeshBasicMaterial({ map: winTex, toneMapped: false })
          const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
          win.position.set(f.x + f.nx * 0.02, 2.1, f.z + f.nz * 0.02)
          win.rotation.y = f.yaw
          this.scene.add(win); this.staticTargets.push(win)
          box(this.scene, 0x3a2a1c, f.nx !== 0 ? 0.05 : 0.06, h, f.nz !== 0 ? 0.05 : 0.06, f.x + f.nx * 0.035, 2.1, f.z + f.nz * 0.035, { rotY: f.yaw })
          glow(this.scene, this.theme.accent, 1.4, f.x + f.nx * 0.2, 2.1, f.z + f.nz * 0.2, 0.06)
        }
      }
      const count = room.kind === 'throne' ? 3 : 2
      for (let i = 0; i < count; i++) {
        const f = pick()
        if (!f) break
        const w = 1.45 + rand() * 0.4, h = 1.05 + rand() * 0.25
        const art = paintingTexture(paintIndex++ % 5)
        box(this.scene, 0xb08a44, f.nx !== 0 ? 0.05 : w + 0.18, h + 0.18, f.nz !== 0 ? 0.05 : w + 0.18, f.x - f.nx * 0.012, 2.05, f.z - f.nz * 0.012, { rotY: f.yaw, metalness: 0.5, roughness: 0.35 })
        const mat = new THREE.MeshBasicMaterial({ map: art, toneMapped: false })
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
        pic.position.set(f.x + f.nx * 0.022, 2.05, f.z + f.nz * 0.022)
        pic.rotation.y = f.yaw
        this.scene.add(pic); this.staticTargets.push(pic)
      }
      // sconce
      if (rand() > 0.5) {
        const f = pick()
        if (f) {
          box(this.scene, 0x2a1e14, f.nx !== 0 ? 0.08 : 0.22, 0.32, f.nz !== 0 ? 0.08 : 0.22, f.x + f.nx * 0.06, 3.2, f.z + f.nz * 0.06, { rotY: f.yaw })
          const fl = glow(this.scene, 0xffa050, 0.8, f.x + f.nx * 0.24, 3.24, f.z + f.nz * 0.24, 0.55)
          fl.userData.flicker = Math.random() * 10
          this.embers.push({ sprite: fl, base: fl.position.clone(), phase: Math.random() * 6.28, type: 'flicker' })
        }
      }
    }

    // blood and grime
    for (let i = 0; i < 14; i++) {
      const room = this.spec.rooms[Math.floor(rand() * this.spec.rooms.length)]
      const x = (room.x + 0.4 + rand() * (room.w - 0.8) - 13.5) * TILE
      const z = (room.z + 0.4 + rand() * (room.d - 0.8) - 13.5) * TILE
      const mat = new THREE.MeshBasicMaterial({ map: bloodTexture(), transparent: true, opacity: 0.35 + rand() * 0.3, depthWrite: false, toneMapped: false })
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + rand() * 1.6, 0.9 + rand() * 1.6), mat)
      m.rotation.x = -Math.PI / 2
      m.rotation.z = rand() * Math.PI * 2
      m.position.set(x, 0.028, z)
      this.scene.add(m)
    }
    // scattered bones / debris
    for (let i = 0; i < 6; i++) {
      const room = this.spec.rooms[Math.floor(rand() * this.spec.rooms.length)]
      const x = (room.x + 0.5 + rand() * (room.w - 1) - 13.5) * TILE
      const z = (room.z + 0.5 + rand() * (room.d - 1) - 13.5) * TILE
      const bone = cylinder(this.scene, 0xd8cfb8, 0.035, 0.5 + rand() * 0.4, x, 0.05, z, { rotZ: Math.PI / 2, rotY: rand() * 3, low: true })
    }
  }

  buildPortal() {
    const w = tileToWorld(this.spec.exit.x, this.spec.exit.z)
    const g = new THREE.Group()
    g.position.set(w.x, 0, w.z)
    this.scene.add(g)
    this.exitGroup = g
    const shader = portalShader()
    shader.uniforms.uColor.value.setHex(this.theme.portal)
    const planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.9), shader)
    planeMesh.position.y = 1.65
    g.add(planeMesh)
    this.portalPlane = planeMesh
    this.portalShader = shader
    const ringMat = material(0x3a1a1a, { metalness: 0.7, roughness: 0.3, emissive: 0x2a0505, emissiveIntensity: 0.4 })
    this.portalRingMat = ringMat
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.1, 10, 48), ringMat)
    ring.position.y = 1.65
    g.add(ring)
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.035, 8, 48), material(0x8a7a5a, { metalness: 0.6, roughness: 0.4 }))
    ring2.position.y = 1.65
    g.add(ring2)
    // floor marker
    const floorRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.38, 40), new THREE.MeshBasicMaterial({ color: this.theme.portal, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))
    floorRing.rotation.x = -Math.PI / 2; floorRing.position.y = 0.035
    g.add(floorRing)
    this.portalFloorRing = floorRing
    // beam
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.8, 7, 20, 1, true), new THREE.MeshBasicMaterial({ color: this.theme.portal, transparent: true, opacity: 0.025, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))
    beam.position.y = 3.5
    g.add(beam); this.portalBeam = beam
    this.portalLight = new THREE.PointLight(this.theme.portal, 0, 10, 2)
    this.portalLight.position.set(0, 1.8, 0)
    g.add(this.portalLight)
    // particles
    this.portalParticles = []
    for (let i = 0; i < 26; i++) {
      const s = glow(g, this.theme.portal, 0.14 + Math.random() * 0.2, 0, 0, 0, 0.7)
      s.userData= { a: Math.random() * Math.PI * 2, r: 1.3 + Math.random() * 0.9, y: Math.random() * 3, speed: 0.3 + Math.random() * 0.7 }
      this.portalParticles.push(s)
    }
    g.userData.noHit = true
  }

  buildOrbs() {
    this.orbList = []
    const beamMat = new THREE.MeshBasicMaterial({ color: this.theme.portal, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
    this.spec.orbs.forEach((o, i) => {
      const w = tileToWorld(o.x, o.z)
      const g = new THREE.Group()
      g.position.set(w.x, 0, w.z)
      this.scene.add(g)
      const plum = makePlumbob(0x57e6ff, 0.34)
      plum.position.y = 1.15
      g.add(plum)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.018, 6, 32), new THREE.MeshBasicMaterial({ color: 0x57e6ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.15
      g.add(ring)
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.42, 2.6, 12, 1, true), beamMat.clone())
      beam.position.y = 1.35
      g.add(beam)
      glow(g, 0x57e6ff, 2.6, 0, 1.15, 0, 0.42)
      g.userData.noHit = true
      this.orbList.push({ x: w.x, z: w.z, group: g, plum, ring, beam, collected: false, index: i, baseY: 1.15 })
    })
  }

  buildEnemies() {
    this.enemies = []
    this.enemyGroups = []
    for (const e of this.spec.enemies) {
      const w = tileToWorld(e.x, e.z)
      const enemy = new Enemy(e.type, w.x, w.z, this.theme, this.spec.index)
      this.scene.add(enemy.group)
      this.enemies.push(enemy)
      this.enemyGroups.push(enemy.group)
      if (enemy.type === 'boss') {
        this.boss = enemy
        enemy.group.scale.setScalar(1)
      }
    }
  }

  buildAtmosphere() {
    const rand = hashRandom(5000 + this.spec.index * 71)
    const S = 27 * TILE
    // dust motes
    const count = 340
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * S
      pos[i * 3 + 1] = 0.3 + rand() * (H - 0.4)
      pos[i * 3 + 2] = (rand() - 0.5) * S
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.PointsMaterial({ color: this.theme.dust, size: 0.035, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false })
    this.dustPoints = new THREE.Points(geo, mat)
    this.scene.add(this.dustPoints)

    // embers near pits
    const emberCount = 90
    const epos = new Float32Array(emberCount * 3)
    this.emberSeeds = []
    for (let i = 0; i < emberCount; i++) {
      const pit = this.spec.props.find(p => p.type === 'lavaPit' || p.type === 'slimePit')
      const base = pit ? tileToWorld(pit.x, pit.z) : tileToWorld(13.5, 13.5)
      const a = rand() * Math.PI * 2, r = rand() * 2.4
      epos[i * 3] = base.x + Math.cos(a) * r
      epos[i * 3 + 1] = 0.2 + rand() * 1.6
      epos[i * 3 + 2] = base.z + Math.sin(a) * r
      this.emberSeeds.push({ baseY: epos[i * 3 + 1], speed: 0.2 + rand() * 0.6, phase: rand() * 6.28 })
    }
    const egeo = new THREE.BufferGeometry()
    egeo.setAttribute('position', new THREE.BufferAttribute(epos, 3))
    const emat = new THREE.PointsMaterial({ color: this.theme.accent, size: 0.06, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false })
    this.emberPoints = new THREE.Points(egeo, emat)
    this.scene.add(this.emberPoints)

    // hanging fixtures / chains in some rooms
    for (const room of this.spec.rooms) {
      if (!['atrium', 'throne', 'grandhall', 'ballroom'].includes(room.kind)) continue
      const cx = (room.x + room.w / 2 - 13.5) * TILE
      const cz = (room.z + room.d / 2 - 13.5) * TILE
      for (let i = 0; i < 4; i++) {
        const x = cx + (i % 2 ? 1 : -1) * 2.2
        const z = cz + (i < 2 ? 1 : -1) * 2.0
        cylinder(this.scene, 0x2a2424, 0.02, 1.2, x, H - 0.6, z, { low: true })
      }
    }
  }

  buildPlayer() {
    const w = tileToWorld(this.spec.spawn.x, this.spec.spawn.z)
    this.player = {
      x: w.x, z: w.z, yaw: this.spec.spawn.yaw ?? 0, pitch: 0,
      health: 100, armor: 0, radius: PLAYER_R,
      moving: false,
    }
    this.camera.position.set(w.x, P, w.z)
    this.camera.rotation.set(0, this.player.yaw, 0)
  }

  /* ------------------------------------------------------------------ */
  /* Gameplay                                                           */
  /* ------------------------------------------------------------------ */

  makeHud() {
    return {
      health: this.player.health, armor: this.player.armor,
      clip: this.weapons?.weapon.clip ?? 8, reserve: this.weapons?.weapon.reserve ?? 32,
      maxClip: this.weapons?.weapon.maxClip ?? 8, weaponName: this.weapons?.weapon.name ?? 'PUMP SHOTGUN',
      weapon: this.weapons?.current ?? 'shotgun',
      souls: this.souls, kills: this.kills, totalKills: this.totalKills,
      time: this.time, portalOpen: this.portalOpen, nearExit: this.nearExit,
      objective: this.objectiveText(),
    }
  }

  objectiveText() {
    if (this.portalOpen) return 'THE PORTAL IS OPEN — STEP INSIDE'
    return `COLLECT THE SOUL ORBS · ${this.souls}/3`
  }

  getHud() {
    const h = this.hud
    h.health = Math.ceil(this.player.health)
    h.armor = Math.ceil(this.player.armor)
    h.clip = this.weapons.weapon.clip
    h.reserve = this.weapons.weapon.reserve
    h.maxClip = this.weapons.weapon.maxClip
    h.weaponName = this.weapons.weapon.name
    h.weapon = this.weapons.current
    h.souls = this.souls
    h.kills = this.kills
    h.totalKills = this.totalKills
    h.time = this.time
    h.portalOpen = this.portalOpen
    h.nearExit = this.nearExit
    h.objective = this.objectiveText()
    return h
  }

  look(dx, dy, sens = 0.0022) {
    if (this.dead || this.won) return
    this.player.yaw -= dx * sens
    this.player.pitch -= dy * sens
    this.player.pitch = THREE.MathUtils.clamp(this.player.pitch, -1.45, 1.45)
    this.lookDelta.x = dx
    this.lookDelta.y = dy
  }

  fire() {
    if (this.dead || this.won) return
    this.weapons.tryFire(this)
  }

  switchWeapon(name) {
    if (this.dead || this.won) return
    this.weapons.switchWeapon(name)
  }

  toggleWeapon() {
    if (!this.dead && !this.won) this.weapons.toggleWeapon()
  }

  reload() {
    if (!this.dead && !this.won) this.weapons.reload()
  }

  interact() {
    if (this.dead || this.won) return
    if (this.nearExit) {
      if (this.portalOpen) this.complete()
      else this.events.push({ type: 'toast', text: 'The portal is sealed. Three soul orbs will open it.', kind: 'doom' })
    }
  }

  tileAt(x, z) {
    const tx = Math.floor(x / TILE + 13.5)
    const tz = Math.floor(z / TILE + 13.5)
    if (tx < 0 || tx >= 27 || tz < 0 || tz >= 27) return 1
    return this.grid[tz][tx]
  }

  collides(x, z, r = PLAYER_R) {
    const tx0 = Math.floor((x - r) / TILE + 13.5)
    const tx1 = Math.floor((x + r) / TILE + 13.5)
    const tz0 = Math.floor((z - r) / TILE + 13.5)
    const tz1 = Math.floor((z + r) / TILE + 13.5)
    for (let tz = tz0; tz <= tz1; tz++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (tx < 0 || tx >= 27 || tz < 0 || tz >= 27 || this.grid[tz][tx] === 1) {
          const minX = (tx - 13.5) * TILE, maxX = minX + TILE
          const minZ = (tz - 13.5) * TILE, maxZ = minZ + TILE
          const cx = THREE.MathUtils.clamp(x, minX, maxX)
          const cz = THREE.MathUtils.clamp(z, minZ, maxZ)
          if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true
        }
      }
    }
    for (const b of this.blockers) {
      if ((x - b.x) ** 2 + (z - b.z) ** 2 < (b.r + r * 0.7) ** 2) return true
    }
    return false
  }

  losClear(x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1
    const dist = Math.hypot(dx, dz)
    const steps = Math.ceil(dist / 0.35)
    for (let i = 1; i < steps; i++) {
      const p = i / steps
      if (this.tileAt(x1 + dx * p, z1 + dz * p) === 1) return false
    }
    return true
  }

  alertEnemies() {
    for (const e of this.enemies) {
      if (e.dead) continue
      const d = Math.hypot(e.position.x - this.player.x, e.position.z - this.player.z)
      if (d < 22) e.alert()
    }
  }

  damagePlayer(amount, source) {
    if (this.dead || this.won) return
    let dmg = amount
    if (this.player.armor > 0) {
      const absorbed = Math.min(this.player.armor, dmg * 0.5)
      this.player.armor -= absorbed
      dmg -= absorbed
    }
    this.player.health = Math.max(0, this.player.health - dmg)
    this.shake = Math.min(1, this.shake + 0.65)
    this.events.push({ type: 'damage', amount: dmg })
    sfxHurt()
    if (this.player.health <= 0) this.die()
  }

  die() {
    if (this.dead) return
    this.dead = true
    sfxDeath()
    this.events.push({
      type: 'death',
      stats: { kills: this.kills, total: this.totalKills, souls: this.souls, time: this.time },
    })
  }

  complete() {
    if (this.won) return
    this.won = true
    sfxWin()
    portalEnter()
    const time = this.time
    const killRatio = this.kills / Math.max(1, this.totalKills)
    const grade = time < 90 && killRatio > 0.9 ? 'S' : time < 150 && killRatio > 0.75 ? 'A' : time < 240 ? 'B' : 'C'
    this.events.push({
      type: 'win',
      stats: { kills: this.kills, total: this.totalKills, souls: this.souls, time, grade },
    })
    this.cb.onWin?.(this.spec.id)
  }

  spawnProjectile(from, to, opts) {
    const dir = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z).normalize()
    const color = opts.color ?? 0xff7a2a
    const g = new THREE.Group()
    g.position.set(from.x, from.y, from.z)
    const core = new THREE.Mesh(new THREE.SphereGeometry(opts.radius ?? 0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe0a0, toneMapped: false }))
    g.add(core)
    const shell = new THREE.Mesh(new THREE.SphereGeometry((opts.radius ?? 0.22) * 1.6, 12, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    g.add(shell)
    glow(g, color, (opts.radius ?? 0.22) * 8, 0, 0, 0, 0.7)
    this.scene.add(g)
    this.projectiles.push({ group: g, vel: dir.multiplyScalar(opts.speed ?? 6.5), life: 6, damage: opts.damage ?? 10, radius: opts.radius ?? 0.22, color })
  }

  spawnShockwave(enemy) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 40), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))
    ring.rotation.x = -Math.PI / 2
    ring.position.set(enemy.position.x, 0.06, enemy.position.z)
    this.scene.add(ring)
    this.shockwaves.push({ mesh: ring, life: 0.6, max: 0.6 })
    this.shake = Math.min(1, this.shake + 0.8)
    this.events.push({ type: 'toast', text: 'THE HOMEOWNER SLAMS THE FLOOR. MIND THE MARBLE.', kind: 'doom' })
  }

  onEnemyDeath(enemy) {
    this.kills++
    this.alertEnemies()
    if (enemy.type === 'boss') {
      this.events.push({ type: 'toast', text: 'THE HOMEOWNER HAS LEFT THE ASSOCIATION.', kind: 'gold' })
      for (let i = 0; i < 3; i++) this.spawnPickup(i % 2 ? 'armor' : 'health', enemy.position.x + (i - 1) * 1.1, enemy.position.z + 0.4)
      this.weapons.addAmmo(24)
    } else {
      const roll = Math.random()
      if (roll < 0.28) this.spawnPickup('health', enemy.position.x, enemy.position.z)
      else if (roll < 0.48) this.spawnPickup('armor', enemy.position.x, enemy.position.z)
      else if (roll < 0.8) this.spawnPickup('ammo', enemy.position.x, enemy.position.z)
    }
    this.events.push({ type: 'kill', name: enemy.type })
  }

  makeEnemyCtx() {
    return {
      player: this.player,
      collides: (x, z, r) => this.collides(x, z, r),
      losClear: (x1, z1, x2, z2) => this.losClear(x1, z1, x2, z2),
      damagePlayer: (d, e) => this.damagePlayer(d, e),
      spawnProjectile: (f, t, o) => this.spawnProjectile(f, t, o),
      onDeath: (e) => this.onEnemyDeath(e),
      onHit: () => { this.shake = Math.min(1, this.shake + 0.06) },
      onWindup: () => {},
      onCharge: () => {},
      onMelee: () => { this.shake = Math.min(1, this.shake + 0.35) },
      onShockwave: (e) => this.spawnShockwave(e),
      onBossEnrage: (e) => {
        this.events.push({ type: 'toast', text: 'THE HOMEOWNER IS NO LONGER ACCEPTING OFFERS.', kind: 'doom' })
        this.subtitle('The chandelier is screaming. That is not in the disclosure.')
      },
    }
  }

  playerShoot({ pellets, damage, spread, weapon }) {
    if (this.dead || this.won) return
    this.stats.shots++
    const origin = new THREE.Vector3()
    this.camera.getWorldPosition(origin)
    const baseDir = new THREE.Vector3()
    this.camera.getWorldDirection(baseDir)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion)
    const enemyTargets = []
    for (const e of this.enemies) {
      if (e.dead || e.spawnTimer > 0) continue
      for (const h of e.hitboxes) if (h.visible) enemyTargets.push(h)
    }
    let hitAny = false
    let killedAny = false
    for (let i = 0; i < pellets; i++) {
      const dir = baseDir.clone()
      if (spread > 0) {
        const a = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * spread
        dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r)
      }
      dir.normalize()
      this.raycaster.set(origin, dir)
      this.raycaster.far = 80
      const eHits = this.raycaster.intersectObjects(enemyTargets, false)
      const sHits = this.raycaster.intersectObjects(this.staticTargets, true).filter(h => h.object.isMesh && !h.object.userData.noHit)
      const eHit = eHits[0]
      const sHit = sHits[0]
      if (eHit && (!sHit || eHit.distance <= sHit.distance)) {
        const enemy = eHit.object.userData.enemy
        if (!enemy || enemy.dead) continue
        this.stats.hits++
        hitAny = true
        const head = !!eHit.object.userData.head
        const dmg = enemy.hit(damage, head, eHit.point, this.makeEnemyCtx())
        this.spawnBurst(eHit.point, 0x8a0a0a, 9, 2.2, 0.5)
        this.spawnBurst(eHit.point, 0x3a0404, 5, 1.2, 0.6)
        sfxEnemyHit()
        if (enemy.dead) killedAny = true
        if (head) this.events.push({ type: 'toast', text: 'Headshot. Very feng shui.', kind: 'gold' })
      } else if (sHit) {
        const point = sHit.point
        const normal = sHit.face ? sHit.face.normal.clone().transformDirection(sHit.object.matrixWorld) : new THREE.Vector3(0, 1, 0)
        this.addDecal(point, normal, 'bullet')
        this.spawnBurst(point, 0xffa040, 5, 1.4, 0.22)
        this.spawnBurst(point, 0x6a5a4a, 3, 0.9, 0.35)
      }
    }
    this.shake = Math.min(1, this.shake + (weapon === 'shotgun' ? 0.24 : 0.1))
    this.kick = Math.min(0.06, this.kick + (weapon === 'shotgun' ? 0.045 : 0.02))
    if (hitAny) this.events.push({ type: 'hitmarker', kill: killedAny })
    this.hudTick = 99
  }

  addDecal(point, normal, kind = 'bullet') {
    if (this.decals.length > 46) {
      const old = this.decals.shift()
      old.mesh.parent?.remove(old.mesh)
      old.mesh.geometry.dispose(); old.mesh.material.dispose()
    }
    const tex = kind === 'bullet' ? bulletTexture() : bloodTexture()
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false })
    const size = kind === 'bullet' ? 0.22 : 0.9
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat)
    m.position.copy(point).addScaledVector(normal, 0.025)
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    m.rotation.z = Math.random() * Math.PI
    this.scene.add(m)
    this.decals.push({ mesh: m, life: 18, max: 18 })
  }

  spawnBurst(pos, color, count, speed, life) {
    if (this.particles.length > 130) return
    let meshMat
    if (!this._burstMats) this._burstMats = new Map()
    if (!this._burstMats.has(color)) this._burstMats.set(color, new THREE.MeshBasicMaterial({ color, toneMapped: false }))
    meshMat = this._burstMats.get(color)
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), meshMat)
      m.position.copy(pos)
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI
      m.userData.vel = new THREE.Vector3(Math.sin(b) * Math.cos(a), Math.cos(b) * 0.7 + 0.3, Math.sin(b) * Math.sin(a)).multiplyScalar(speed * (0.4 + Math.random() * 0.8))
      m.userData.life = life * (0.5 + Math.random() * 0.8)
      m.userData.max = m.userData.life
      this.scene.add(m)
      this.particles.push(m)
    }
  }

  spawnPickup(type, x, z) {
    if (this.pickups.length > 18) return
    const g = new THREE.Group()
    g.position.set(x, 0.55, z)
    let color = 0x67d94f
    if (type === 'health') {
      box(g, 0xe8e0c8, 0.42, 0.42, 0.16, 0, 0, 0, { roughness: 0.5, emissive: 0x1a4a1a, emissiveIntensity: 0.3 })
      box(g, 0x1fa83a, 0.28, 0.09, 0.17, 0, 0.02, 0.02)
      box(g, 0x1fa83a, 0.09, 0.28, 0.17, 0, 0.02, 0.02)
      color = 0x67d94f
    } else if (type === 'armor') {
      const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.4, 6), material(0x2a9ab8, { metalness: 0.4, roughness: 0.4, emissive: 0x0a3a4a, emissiveIntensity: 0.5 }))
      vest.scale.z = 0.5; g.add(vest)
      color = 0x57e6ff
    } else {
      box(g, 0x7a2a1a, 0.42, 0.28, 0.32, 0, 0, 0, { roughness: 0.6 })
      for (let i = 0; i < 4; i++) cylinder(g, 0xd8b040, 0.045, 0.2, -0.12 + i * 0.08, 0.14, 0, { low: true })
      color = 0xffb040
    }
    glow(g, color, 1.8, 0, 0, 0, 0.5)
    g.userData = { type, baseY: 0.55, spin: 0, noHit: true }
    this.scene.add(g)
    this.pickups.push({ type, group: g, x, z, collected: false, baseY: 0.55 })
  }

  update(dt) {
    if (this.dead || this.won) {
      this.updateCamera(dt, false)
      this.weapons.update(dt, this.lookDelta, false)
      this.lookDelta.x *= 0.5; this.lookDelta.y *= 0.5
      return
    }
    this.time += dt
    this.introTimer = Math.max(0, this.introTimer - dt)
    this.subtitleTimer = Math.max(0, this.subtitleTimer - dt)
    if (this.subtitleTimer <= 0 && this.subtitleText) {
      this.subtitleText = ''
      this.events.push({ type: 'subtitle', text: '' })
    }
    if (this.introTimer === 0 && !this.introShown) {
      this.introShown = true
      this.subtitle(this.spec.tips[Math.floor(Math.random() * this.spec.tips.length)])
    }

    this.updateMovement(dt)
    this.weapons.update(dt, this.lookDelta, this.player.moving)
    this.lookDelta.x *= Math.max(0, 1 - dt * 12)
    this.lookDelta.y *= Math.max(0, 1 - dt * 12)

    const ctx = this.makeEnemyCtx()
    for (const e of this.enemies) e.update(dt, ctx)
    this.updateProjectiles(dt)
    this.updatePickups(dt)
    this.updatePortal(dt)
    this.updateEffects(dt)
    this.updateCamera(dt, this.player.moving)
    this.updateAtmosphere(dt)

    // portal proximity
    const ex = this.exitGroup.position.x, ez = this.exitGroup.position.z
    const wasNear = this.nearExit
    this.nearExit = Math.hypot(this.player.x - ex, this.player.z - ez) < 2.6
    if (this.nearExit !== wasNear) this.hudTick = 99
    if (this.nearExit && !this.portalOpen) {
      if (!this._sealedHint || this.time - this._sealedHint > 4) {
        this._sealedHint = this.time
        this.events.push({ type: 'toast', text: `The portal is sealed. ${3 - this.souls} soul orb${this.souls === 2 ? '' : 's'} remaining.`, kind: 'doom' })
      }
    }

    for (const fn of this.propUpdates) fn(this.time, dt)

    // hud tick
    this.hudTick -= dt
    if (this.hudTick <= 0) { this.hudTick = 0.2 }

    // footsteps
    if (this.player.moving) {
      this.stepTimer -= dt
      if (this.stepTimer <= 0) { this.stepTimer = 0.42; footstep() }
    }
  }

  updateMovement(dt) {
    const p = this.player
    let f = (this.input.forward ? 1 : 0) - (this.input.back ? 1 : 0)
    let s = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0)
    f += this.input.touchY || 0
    s += this.input.touchX || 0
    const len = Math.hypot(f, s)
    if (len > 1) { f /= len; s /= len }
    const speed = this.input.sprint && f > 0 ? 6.1 : 4.35
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw)
    const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw)
    const vx = (fx * f + rx * s) * speed * dt
    const vz = (fz * f + rz * s) * speed * dt
    const moving = Math.abs(vx) + Math.abs(vz) > 0.0001
    p.moving = moving
    if (moving) {
      if (!this.collides(p.x + vx, p.z, p.radius)) p.x += vx
      if (!this.collides(p.x, p.z + vz, p.radius)) p.z += vz
      this.bobPhase += dt * (this.input.sprint ? 13 : 10)
    }
    this.kick = Math.max(0, this.kick - dt * 0.25)
    this.shake = Math.max(0, this.shake - dt * 2.4)
  }

  updateCamera(dt, moving) {
    const p = this.player
    const bob = moving ? Math.sin(this.bobPhase) * 0.045 : Math.sin(this.time * 1.7) * 0.008
    const shake = this.shake * this.shake
    const sx = (Math.random() - 0.5) * shake * 0.13
    const sy = (Math.random() - 0.5) * shake * 0.1
    this.camera.position.set(p.x + sx, P + bob + sy, p.z + sx * 0.4)
    this.camera.rotation.y = p.yaw + (Math.random() - 0.5) * shake * 0.012
    this.camera.rotation.x = p.pitch + this.kick + (Math.random() - 0.5) * shake * 0.01
    this.camera.rotation.z = (Math.random() - 0.5) * shake * 0.018
    if (this.playerLight) this.playerLight.position.set(p.x, 2.1 + bob, p.z)
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      p.life -= dt
      const pos = p.group.position
      pos.addScaledVector(p.vel, dt)
      const d = Math.hypot(pos.x - this.player.x, pos.z - this.player.z)
      let remove = false
      if (this.collides(pos.x, pos.z, 0.08) || pos.y < 0.08 || p.life <= 0) remove = true
      if (d < 0.7 && Math.abs(pos.y - 1.2) < 1.2) {
        this.damagePlayer(p.damage)
        this.spawnBurst(pos, p.color, 10, 2, 0.4)
        remove = true
      }
      if (remove) {
        this.scene.remove(p.group)
        this.projectiles.splice(i, 1)
        this.spawnBurst(pos, p.color, 6, 1.4, 0.3)
      } else {
        p.group.rotation.y += dt * 6
      }
    }
  }

  updatePickups(dt) {
    for (const o of this.orbList) {
      if (o.collected) continue
      o.plum.rotation.y += dt * 2
      o.plum.position.y = o.baseY + Math.sin(this.time * 2 + o.index) * 0.15
      o.ring.rotation.z += dt * 0.8
      o.beam.material.opacity = 0.03 + Math.abs(Math.sin(this.time * 2 + o.index)) * 0.03
      const d = Math.hypot(o.x - this.player.x, o.z - this.player.z)
      if (d < 1.3) this.collectOrb(o)
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]
      const g = p.group
      g.position.y = p.baseY + Math.sin(this.time * 2.5 + i) * 0.09
      g.rotation.y += dt * 1.5
      const d = Math.hypot(p.x - this.player.x, p.z - this.player.z)
      if (d < 1.1) {
        if (p.type === 'health' && this.player.health >= 100) continue
        if (p.type === 'armor' && this.player.armor >= 100) continue
        if (p.type === 'health') { this.player.health = Math.min(100, this.player.health + 25); this.events.push({ type: 'toast', text: '+25 VITALITY. Tastes like pennies.', kind: 'soul' }) }
        else if (p.type === 'armor') { this.player.armor = Math.min(100, this.player.armor + 30); this.events.push({ type: 'toast', text: '+30 ARMOR. HOA-approved.', kind: 'soul' }) }
        else { this.weapons.addAmmo(8); this.events.push({ type: 'toast', text: '+8 SHELLS. The seller kept them in the freezer.', kind: 'soul' }) }
        sfxPickup(p.type)
        this.scene.remove(g)
        this.pickups.splice(i, 1)
        this.hudTick = 99
      }
    }
  }

  collectOrb(o) {
    o.collected = true
    o.group.visible = false
    this.souls++
    sfxSoul()
    this.events.push({ type: 'orb', index: o.index, souls: this.souls })
    this.events.push({ type: 'toast', text: `SOUL ORB ${this.souls}/3 · ${['The wallpaper is watching.', 'The plumbing is chanting.', 'The open house is nearly closed.'][o.index] ?? ''}`, kind: 'soul' })
    if (this.souls >= 3) {
      this.portalOpen = true
      portalOpen()
      this.portalShader.uniforms.uActive.value = 1
      this.portalRingMat.color.setHex(this.theme.portal)
      this.portalRingMat.emissive.setHex(this.theme.portal)
      this.portalRingMat.emissiveIntensity = 2.2
      this.portalLight.intensity = 8
      this.portalFloorRing.material.opacity = 0.6
      this.portalBeam.material.opacity = 0.09
      this.events.push({ type: 'toast', text: 'THE PORTAL IS OPEN. THE EXIT IS NORTH. TAKE THE TOUR.', kind: 'gold' })
      this.subtitle('A door upstairs slams shut. The Homeowner knows you are leaving.')
    }
    this.hudTick = 99
  }

  updatePortal(dt) {
    this.portalShader.uniforms.uTime.value += dt
    this.portalPlane.rotation.z += dt * 0.04
    this.portalFloorRing.rotation.z += dt * 0.4
    if (this.portalOpen) {
      this.portalLight.intensity = 7 + Math.sin(this.time * 5) * 1.5
      this.portalBeam.material.opacity = 0.07 + Math.sin(this.time * 2) * 0.02
    } else {
      this.portalLight.intensity = 0.6 + Math.sin(this.time * 1.4) * 0.2
    }
    for (const s of this.portalParticles) {
      const u = s.userData
      u.a += dt * u.speed
      s.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(this.time * 1.5 + u.a) * 0.2, Math.sin(u.a) * u.r)
      s.material.opacity = this.portalOpen ? 0.35 + Math.abs(Math.sin(this.time * 2 + u.a)) * 0.6 : 0.12
    }
  }

  updateEffects(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.userData.life -= dt
      if (p.userData.life <= 0) {
        this.scene.remove(p)
        p.geometry.dispose()
        this.particles.splice(i, 1)
        continue
      }
      p.userData.vel.y -= dt * 7
      p.position.addScaledVector(p.userData.vel, dt)
      p.rotation.x += dt * 6
      p.rotation.y += dt * 4
      p.material.opacity = 1
      const s = Math.max(0.1, p.userData.life / p.userData.max)
      p.scale.setScalar(0.6 + s * 0.8)
    }
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i]
      d.life -= dt
      d.mesh.material.opacity = Math.min(0.95, d.life / 3)
      if (d.life <= 0) {
        this.scene.remove(d.mesh)
        d.mesh.geometry.dispose(); d.mesh.material.dispose()
        this.decals.splice(i, 1)
      }
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i]
      s.life -= dt
      const p = 1 - s.life / s.max
      s.mesh.scale.setScalar(1 + p * 7)
      s.mesh.material.opacity = 0.8 * (1 - p)
      if (s.life <= 0) {
        this.scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose()
        this.shockwaves.splice(i, 1)
      }
    }
    // weapon muzzle light? handled in weapon
    this.portalShader.uniforms.uTime.value += dt
  }

  updateAtmosphere(dt) {
    if (this.dustPoints) {
      this.dustPoints.rotation.y += dt * 0.007
      const pos = this.emberPoints.geometry.attributes.position
      for (let i = 0; i < this.emberSeeds.length; i++) {
        const s = this.emberSeeds[i]
        pos.array[i * 3 + 1] = s.baseY + Math.sin(this.time * s.speed + s.phase) * 0.8 + ((this.time * s.speed * 0.25) % 1.6)
        if (pos.array[i * 3 + 1] > H) pos.array[i * 3 + 1] = 0.2
      }
      pos.needsUpdate = true
    }
    for (const e of this.embers) {
      if (e.type === 'flicker') {
        e.sprite.material.opacity = 0.35 + Math.abs(Math.sin(this.time * 7 + e.phase)) * 0.4 + Math.random() * 0.08
      }
    }
  }

  subtitle(text) {
    this.subtitleText = text
    this.subtitleTimer = 5.5
    this.events.push({ type: 'subtitle', text })
  }

  drainEvents() {
    const e = this.events
    this.events = []
    return e
  }

  drawMinimap(ctx, w, h) {
    const cell = w / 27
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#050705'
    ctx.fillRect(0, 0, w, h)
    for (let z = 0; z < 27; z++) for (let x = 0; x < 27; x++) {
      if (this.grid[z][x] === 0) {
        ctx.fillStyle = 'rgba(70, 100, 66, .5)'
        ctx.fillRect(x * cell, z * cell, cell + 0.5, cell + 0.5)
      }
    }
    // orbs
    for (const o of this.orbList) {
      if (o.collected) continue
      const tx = (o.x / TILE + 13.5) * cell
      const tz = (o.z / TILE + 13.5) * cell
      ctx.fillStyle = '#57e6ff'
      ctx.beginPath(); ctx.arc(tx, tz, cell * 0.45, 0, Math.PI * 2); ctx.fill()
    }
    // exit
    const ex = (this.exitGroup.position.x / TILE + 13.5) * cell
    const ez = (this.exitGroup.position.z / TILE + 13.5) * cell
    ctx.fillStyle = this.portalOpen ? '#b8ff3d' : '#8a5a2a'
    ctx.fillRect(ex - cell * 0.5, ez - cell * 0.5, cell, cell)
    // enemies
    for (const e of this.enemies) {
      if (e.dead) continue
      const d = Math.hypot(e.position.x - this.player.x, e.position.z - this.player.z)
      if (d > 17) continue
      const tx = (e.position.x / TILE + 13.5) * cell
      const tz = (e.position.z / TILE + 13.5) * cell
      ctx.fillStyle = e.type === 'boss' ? '#ff2a4a' : '#ff5a24'
      ctx.beginPath(); ctx.arc(tx, tz, e.type === 'boss' ? cell * 0.6 : cell * 0.34, 0, Math.PI * 2); ctx.fill()
    }
    // player
    const px = (this.player.x / TILE + 13.5) * cell
    const pz = (this.player.z / TILE + 13.5) * cell
    ctx.save()
    ctx.translate(px, pz)
    ctx.rotate(-this.player.yaw)
    ctx.fillStyle = '#f2ead7'
    ctx.beginPath(); ctx.moveTo(0, -cell * 0.65); ctx.lineTo(cell * 0.42, cell * 0.5); ctx.lineTo(0, cell * 0.25); ctx.lineTo(-cell * 0.42, cell * 0.5); ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  getWaypoint() {
    if (this.portalOpen) {
      return { x: this.exitGroup.position.x, z: this.exitGroup.position.z, type: 'exit' }
    }
    let best = null, bestD = Infinity
    for (const o of this.orbList) {
      if (o.collected) continue
      const d = Math.hypot(o.x - this.player.x, o.z - this.player.z)
      if (d < bestD) { bestD = d; best = { x: o.x, z: o.z, type: 'orb' } }
    }
    return best
  }

  resize(aspect) {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
    this.weapons.resize(aspect)
  }

  render(renderer) {
    renderer.render(this.scene, this.camera)
    this.weapons.render(renderer)
  }

  dispose() {
    this.scene.traverse(o => {
      if (o.isMesh || o.isPoints) {
        if (o.geometry && !Object.values(G).includes(o.geometry)) o.geometry.dispose?.()
        if (o.isPoints && o.material) o.material.dispose?.()
      }
    })
    this.scene.clear()
    this.weapons.scene.clear()
  }
}

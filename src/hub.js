import * as THREE from 'three'
import { box, cylinder, sphere, cone, ico, torus, plane, glow, material, texturedBox, light, basicMaterial } from './art.js'
import {
  grassTexture, roadTexture, concreteTexture, sidingTexture, shingleTexture,
  windowTexture, signTexture, cloudTexture, starfieldTexture,
} from './textures.js'
import { makePlumbob } from './props.js'

const RING_R = 13.8
const HOUSE_R = 22.5
const MANOR = new THREE.Vector3(0, 0, 0)

function seededRandom(seed) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x3e6f9e) },
      midColor: { value: new THREE.Color(0x8db6cf) },
      horizonColor: { value: new THREE.Color(0xf4d8a8) },
      bottomColor: { value: new THREE.Color(0x6f8a72) },
    },
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `varying vec3 vWorld; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWorld=wp.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vWorld; uniform vec3 topColor, midColor, horizonColor, bottomColor;
      void main(){
        float h=normalize(vWorld).y;
        vec3 c=mix(horizonColor,midColor,smoothstep(0.0,0.28,h));
        c=mix(c,topColor,smoothstep(0.28,0.85,h));
        c=mix(bottomColor,c,smoothstep(-0.08,0.03,h));
        float haze=exp(-max(h,0.0)*9.0)*0.18;
        c+=vec3(1.0,0.72,0.4)*haze;
        gl_FragColor=vec4(c,1.0);
      }`,
  })
}

function makeTree({ scale = 1, dead = false, color = 0x3f6b3a } = {}) {
  const g = new THREE.Group()
  const trunkH = 2.4 * scale
  cylinder(g, dead ? 0x33291f : 0x5a402a, 0.2 * scale, trunkH, 0, trunkH / 2, 0, { rotZ: 0.02, roughness: 0.95, castShadow: true })
  if (dead) {
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + 0.3
      const len = (1.1 + (i % 2) * 0.5) * scale
      const b = cylinder(g, 0x2f251b, 0.07 * scale, len, Math.cos(a) * len * 0.32, trunkH + 0.5 * scale + i * 0.12, Math.sin(a) * len * 0.32, {
        rotZ: Math.cos(a) * 0.75, rotX: Math.sin(a) * 0.75, low: true, roughness: 1, castShadow: true,
      })
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + 0.6
      ico(g, i % 2 ? color : new THREE.Color(color).multiplyScalar(0.82).getHex(), (1.15 + (i % 2) * 0.28) * scale,
        Math.cos(a) * 0.55 * scale, trunkH + 0.8 * scale + (i % 2) * 0.35 * scale, Math.sin(a) * 0.55 * scale,
        { low: true, flatShading: true, roughness: 0.95, castShadow: true })
    }
    ico(g, new THREE.Color(color).multiplyScalar(1.08).getHex(), 1.05 * scale, 0, trunkH + 1.65 * scale, 0, { low: true, flatShading: true, roughness: 0.92, castShadow: true })
  }
  g.scale.setScalar(1)
  return g
}

function makeBush(color = 0x3d6635, r = 0.55) {
  const g = new THREE.Group()
  ico(g, color, r, 0, r * 0.7, 0, { low: true, flatShading: true, roughness: 0.95, castShadow: true })
  ico(g, new THREE.Color(color).multiplyScalar(0.85).getHex(), r * 0.7, r * 0.7, r * 0.55, 0.2, { low: true, flatShading: true, roughness: 0.95, castShadow: true })
  ico(g, new THREE.Color(color).multiplyScalar(1.1).getHex(), r * 0.62, -r * 0.6, r * 0.5, -0.15, { low: true, flatShading: true, roughness: 0.95, castShadow: true })
  return g
}

function makeCar(color = 0x8a3a34) {
  const g = new THREE.Group()
  box(g, color, 1.75, 0.58, 3.75, 0, 0.62, 0, { roughness: 0.32, metalness: 0.4, castShadow: true })
  box(g, new THREE.Color(color).multiplyScalar(0.7).getHex(), 1.5, 0.5, 1.9, 0, 1.1, -0.2, { roughness: 0.3, metalness: 0.4, castShadow: true })
  box(g, 0x1b2831, 1.42, 0.34, 1.55, 0, 1.16, -0.19, { roughness: 0.1, metalness: 0.7 })
  box(g, 0xd8d2b8, 0.5, 0.15, 0.04, -0.55, 0.68, 1.89, { emissive: 0xfff0c0, emissiveIntensity: 0.4 })
  box(g, 0xd8d2b8, 0.5, 0.15, 0.04, 0.55, 0.68, 1.89, { emissive: 0xfff0c0, emissiveIntensity: 0.4 })
  box(g, 0xa02020, 0.42, 0.14, 0.04, -0.55, 0.66, -1.89, { emissive: 0xff2010, emissiveIntensity: 0.5 })
  box(g, 0xa02020, 0.42, 0.14, 0.04, 0.55, 0.66, -1.89, { emissive: 0xff2010, emissiveIntensity: 0.5 })
  for (const x of [-0.86, 0.86]) for (const z of [-1.2, 1.2]) {
    const w = cylinder(g, 0x1a1918, 0.34, 0.22, x, 0.34, z, { rotZ: Math.PI / 2, low: true, roughness: 0.9 })
    cylinder(g, 0x8a8f8a, 0.15, 0.24, x, 0.34, z, { rotZ: Math.PI / 2, low: true, metalness: 0.8, roughness: 0.3 })
  }
  box(g, 0xd8d2b8, 1.2, 0.08, 0.08, 0, 0.5, 1.92)
  return g
}

function makeStreetLamp() {
  const g = new THREE.Group()
  cylinder(g, 0x2b302b, 0.09, 4.4, 0, 2.2, 0, { low: true, roughness: 0.6, castShadow: true })
  cylinder(g, 0x2b302b, 0.07, 1.2, 0.5, 4.3, 0, { rotZ: -0.35, low: true })
  box(g, 0x1d211d, 0.6, 0.16, 0.36, 1.0, 4.5, 0, { roughness: 0.4 })
  const bulb = box(g, 0xffe0a0, 0.44, 0.06, 0.28, 1.0, 4.4, 0, { emissive: 0xffd090, emissiveIntensity: 2.5 })
  glow(g, 0xffc070, 2.6, 1.0, 4.3, 0, 0.22)
  light(g, 0xffc070, 10, 15, 1.0, 4.2, 0)
  return g
}

function makeMailbox(color = 0x3a4a3a) {
  const g = new THREE.Group()
  cylinder(g, 0x4a3a28, 0.055, 0.95, 0, 0.48, 0, { low: true, castShadow: true })
  box(g, color, 0.52, 0.3, 0.72, 0, 1.02, 0, { roughness: 0.5, castShadow: true })
  cylinder(g, color, 0.26, 0.72, 0, 1.17, 0, { rotX: Math.PI / 2, low: true, roughness: 0.5 })
  box(g, 0xc44a2a, 0.04, 0.3, 0.16, 0.29, 1.12, 0.12)
  box(g, 0xe8e0c8, 0.2, 0.1, 0.02, 0, 1.02, 0.37)
  return g
}

function makeFountain() {
  const g = new THREE.Group()
  const stone = 0x9a9482
  torus(g, stone, 2.35, 0.22, 0, 0.3, 0, { rotX: Math.PI / 2, roughness: 0.85, castShadow: true })
  cylinder(g, 0x6a7a72, 2.3, 0.12, 0, 0.18, 0, { roughness: 0.4, metalness: 0.1 })
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.12, 40), new THREE.MeshStandardMaterial({
    color: 0x3e8a86, roughness: 0.18, metalness: 0.2, emissive: 0x1d5a5a, emissiveIntensity: 0.3, transparent: true, opacity: 0.88,
  }))
  water.rotation.x = -Math.PI / 2; water.position.y = 0.25
  g.add(water)
  cylinder(g, stone, 0.34, 1.1, 0, 0.8, 0, { roughness: 0.8, castShadow: true })
  cylinder(g, stone, 0.7, 0.14, 0, 1.36, 0, { roughness: 0.8 })
  torus(g, stone, 0.48, 0.1, 0, 1.5, 0, { rotX: Math.PI / 2, roughness: 0.8 })
  const plum = makePlumbob(0x67d94f, 0.42)
  plum.position.set(0, 2.0, 0)
  g.add(plum)
  glow(g, 0x8affa0, 3, 0, 1.8, 0, 0.16)
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2
    box(g, 0x7a8a78, 0.12, 0.5, 0.12, Math.cos(a) * 2.35, 0.35, Math.sin(a) * 2.35, { roughness: 0.8 })
  }
  return { group: g, water, plum }
}

function gable(parent, width, rise, depth, y, z, color, texture) {
  const shape = new THREE.Shape()
  shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, rise); shape.lineTo(-width / 2, 0)
  const geo = new THREE.ShapeGeometry(shape)
  const mat = texture
    ? new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide })
    : material(color, { roughness: 0.9, side: THREE.DoubleSide })
  const m = new THREE.Mesh(geo, mat)
  m.position.set(0, y, z)
  if (z < 0) m.rotation.y = Math.PI
  parent.add(m)
  return m
}

function roof(parent, width, rise, depth, y, texture, color) {
  const angle = Math.atan2(rise, width / 2)
  const len = Math.hypot(width / 2, rise)
  for (const s of [-1, 1]) {
    const mat = new THREE.MeshStandardMaterial({ map: texture.clone(), roughness: 0.92, color })
    mat.map.repeat.set(3, 2); mat.map.needsUpdate = true
    const panel = new THREE.Mesh(new THREE.BoxGeometry(len + 0.7, 0.26, depth + 1.0), mat)
    panel.position.set(s * (width / 4), y + rise / 2, 0)
    panel.rotation.z = -s * angle
    panel.castShadow = true; panel.receiveShadow = true
    parent.add(panel)
  }
  box(parent, 0x2b1e18, width + 0.5, 0.18, depth + 0.6, 0, y + rise - 0.02, 0)
}

function fence(group, color = 0xdcd6c2, height = 0.9, iron = false) {
  const positions = []
  const step = iron ? 0.34 : 0.5
  for (let x = -6.3; x <= 6.3; x += step) { if (Math.abs(x) > 0.95) positions.push([x, 6.35, 0]) }
  for (let x = -6.3; x <= 6.3; x += step) positions.push([x, -5.8, 0])
  for (let z = -5.8; z <= 6.35; z += step) { positions.push([-6.3, z, 1]); positions.push([6.3, z, 1]) }
  const geo = new THREE.BoxGeometry(iron ? 0.045 : 0.1, height, iron ? 0.045 : 0.05)
  const mat = material(color, { roughness: iron ? 0.4 : 0.8, metalness: iron ? 0.6 : 0 })
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length)
  const dummy = new THREE.Object3D()
  positions.forEach(([x, z, side], i) => {
    dummy.position.set(x, height / 2 + 0.04, z)
    dummy.rotation.y = side ? Math.PI / 2 : 0
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  })
  mesh.castShadow = true
  mesh.instanceMatrix.needsUpdate = true
  group.add(mesh)
  // rails
  for (const z of [6.35, -5.8]) {
    box(group, color, 12.7, 0.06, 0.05, 0, height * 0.7, z, { roughness: 0.8 })
    box(group, color, 12.7, 0.06, 0.05, 0, height * 0.25, z, { roughness: 0.8 })
  }
  for (const x of [-6.3, 6.3]) {
    box(group, color, 0.05, 0.06, 12.2, x, height * 0.7, 0.28)
    box(group, color, 0.05, 0.06, 12.2, x, height * 0.25, 0.28)
  }
  if (iron) {
    for (const [x, z] of positions.filter((_, i) => i % 4 === 0)) {
      cone(group, 0x1a1a1a, 0.05, 0.2, x, height + 0.12, z, { low: true })
    }
  }
  for (const [x, z] of [[-6.3, 6.35], [6.3, 6.35], [-6.3, -5.8], [6.3, -5.8], [-0.95, 6.35], [0.95, 6.35]]) {
    box(group, color, 0.18, height + 0.25, 0.18, x, (height + 0.25) / 2, z)
  }
}

function makeFlowerbed(group, x, z, color = 0xd85a7a, n = 8) {
  box(group, 0x4a3828, n * 0.22, 0.12, 0.55, x, 0.08, z, { roughness: 1 })
  for (let i = 0; i < n; i++) {
    const px = x - n * 0.1 + i * 0.2
    cylinder(group, 0x3d6a32, 0.015, 0.28, px, 0.25, z + (i % 2) * 0.08, { low: true })
    sphere(group, color, 0.075, px, 0.42, z + (i % 2) * 0.08, { low: true, roughness: 0.9 })
  }
}

export class Hub {
  constructor(levels, save) {
    this.levels = levels
    this.save = save
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0xb8c8b0, 0.0068)
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500)
    this.raycaster = new THREE.Raycaster()
    this.houses = []
    this.hovered = -1
    this.selected = -1
    this.time = 0
    this.orbit = { angle: Math.PI / 2 + 0.12, radius: 47, height: 33, targetRadius: 47, targetHeight: 33 }
    this.dragging = false
    this.lastInteract = 0
    this.camera.position.set(32, 29, 22)
    this.camera.lookAt(0, 2, 0)
    this.clouds = []
    this.fireflies = []
    this.build()
  }

  build() {
    const scene = this.scene
    scene.add(new THREE.AmbientLight(0xdfe8d0, 0.55))
    const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x52633e, 1.15)
    scene.add(hemi)

    const sunDir = new THREE.Vector3(48, 66, 30)
    const sun = new THREE.DirectionalLight(0xffe4b0, 2.35)
    sun.position.copy(sunDir)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -52; sun.shadow.camera.right = 52
    sun.shadow.camera.top = 52; sun.shadow.camera.bottom = -52
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 160
    sun.shadow.bias = -0.0008
    sun.shadow.normalBias = 0.02
    scene.add(sun)
    scene.add(sun.target)
    sun.target.position.set(0, 0, 0)

    // sky
    const sky = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 18), skyMaterial())
    sky.renderOrder = -10
    scene.add(sky)
    const sunGlow = glow(scene, 0xffe0a0, 70, 100, 90, 62, 0.38)
    sunGlow.material.depthWrite = false
    const sunCore = glow(scene, 0xfff4d0, 24, 100, 90, 62, 0.85)

    // ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 0.95 }))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.02
    ground.receiveShadow = true
    scene.add(ground)

    // distant hills
    const rand = seededRandom(91)
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2
      const r = 85 + rand() * 45
      const h = 7 + rand() * 16
      ico(scene, new THREE.Color().setHSL(0.28 + rand() * 0.06, 0.22, 0.38 + rand() * 0.08).getHex(), h * 1.4, Math.cos(a) * r, h * 0.32, Math.sin(a) * r, { low: true, flatShading: true, roughness: 1 })
    }

    // roads
    const ringGeo = new THREE.RingGeometry(9.6, RING_R, 96)
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.92 }))
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.015; ring.receiveShadow = true
    scene.add(ring)
    const sidewalk = new THREE.Mesh(new THREE.RingGeometry(RING_R, RING_R + 1.5, 96), new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.85 }))
    sidewalk.rotation.x = -Math.PI / 2; sidewalk.position.y = 0.03; sidewalk.receiveShadow = true
    scene.add(sidewalk)

    // road dashes
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2
      const dash = box(scene, 0xe0c45a, 0.16, 0.02, 1.0, Math.cos(a) * 11.7, 0.035, Math.sin(a) * 11.7, { emissive: 0x4a3a10, emissiveIntensity: 0.2 })
      dash.rotation.y = -a
    }

    // center island
    const island = new THREE.Mesh(new THREE.CircleGeometry(9.4, 64), new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 0.95 }))
    island.rotation.x = -Math.PI / 2; island.position.y = 0.035; island.receiveShadow = true
    scene.add(island)
    torus(scene, 0xb8b2a0, 9.35, 0.24, 0, 0.1, 0, { rotX: Math.PI / 2, roughness: 0.8 })
    // patio
    const patio = new THREE.Mesh(new THREE.CircleGeometry(4.3, 40), new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.85 }))
    patio.rotation.x = -Math.PI / 2; patio.position.y = 0.045
    scene.add(patio)
    const fountain = makeFountain()
    scene.add(fountain.group)
    this.fountain = fountain

    // dead end sign
    const signGroup = new THREE.Group()
    signGroup.position.set(0, 0, 5.2)
    scene.add(signGroup)
    for (const x of [-1.2, 1.2]) box(signGroup, 0x4a3524, 0.16, 2.8, 0.16, x, 1.4, 0, { castShadow: true, roughness: 0.85 })
    box(signGroup, 0x2c3a26, 3.6, 1.45, 0.16, 0, 2.55, 0, { roughness: 0.7, metalness: 0.1, castShadow: true })
    const signTex = signTexture(['DEAD END', 'DRIVE'], { w: 640, h: 256, bg: '#20301f', color: '#efe4c4', accent: '#b8ff3d', borderColor: '#d9ca9a', wood: true, distress: true, fontSize: 78 })
    const signFace = plane(signGroup, 0xffffff, 3.3, 1.25, 0, 2.55, 0.09, { mat: new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }) })
    const signBack = plane(signGroup, 0x1a2419, 3.3, 1.25, 0, 2.55, -0.09, { basic: true, rotY: Math.PI })
    const tip = makePlumbob(0xb8ff3d, 0.26)
    tip.position.set(0, 3.65, 0); signGroup.add(tip)
    this.signPlumbob = tip

    // street lamps
    for (const a of [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4]) {
      const lamp = makeStreetLamp()
      lamp.position.set(Math.cos(a) * (RING_R + 2.1), 0, Math.sin(a) * (RING_R + 2.1))
      lamp.rotation.y = -a + Math.PI / 2
      scene.add(lamp)
    }

    // background neighborhood
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2 + 0.24
      const r = 52 + (i % 3) * 9
      const h = new THREE.Group()
      h.position.set(Math.cos(a) * r, 0, Math.sin(a) * r)
      h.rotation.y = -a + Math.PI / 2
      const bw = 7 + (i % 3) * 1.6, bd = 6 + (i % 2) * 2
      const bodyColor = [0xcdbfa0, 0xb8a88a, 0x9fae9a, 0xc8b6b0][i % 4]
      box(h, bodyColor, bw, 4.4, bd, 0, 2.2, 0, { roughness: 0.9 })
      roof(h, bw + 0.8, 2.2, bd + 0.6, 4.4, shingleTexture(i % 2 ? '#5d4a42' : '#6d5142'), 0xffffff)
      for (let w = 0; w < 3; w++) plane(h, 0xffe0a0, 0.8, 1.1, -bw / 3 + w * bw / 3, 2.4, bd / 2 + 0.02, { basic: true })
      scene.add(h)
    }

    // clouds
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTexture(), color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }))
      const a = Math.random() * Math.PI * 2, r = 55 + Math.random() * 90
      s.position.set(Math.cos(a) * r, 42 + Math.random() * 26, Math.sin(a) * r)
      s.scale.set(28 + Math.random() * 26, 12 + Math.random() * 9, 1)
      s.userData.speed = 0.35 + Math.random() * 0.5
      scene.add(s)
      this.clouds.push(s)
    }

    // fireflies
    for (let i = 0; i < 22; i++) {
      const s = glow(scene, i % 3 === 0 ? 0xffd166 : 0xb8ff3d, 0.22 + Math.random() * 0.2, 0, 0, 0, 0.7)
      s.userData.orbit = { a: Math.random() * Math.PI * 2, r: 6 + Math.random() * 10, y: 0.8 + Math.random() * 2.4, speed: 0.2 + Math.random() * 0.5 }
      this.fireflies.push(s)
    }

    // houses
    this.levels.forEach((level, i) => {
      const a = Math.PI / 4 + i * Math.PI / 2
      const pos = new THREE.Vector3(Math.cos(a) * HOUSE_R, 0, Math.sin(a) * HOUSE_R)
      this.houses.push(this.buildHouse(level, i, pos))
    })

    // central trees
    for (const [x, z, s] of [[-6.4, 4.3, 1.1], [6.2, 3.8, 1.25], [-7.6, -2.2, 0.9], [7.4, -2.6, 1.0]]) {
      const t = makeTree({ scale: s, color: 0x416e38 })
      t.position.set(x, 0, z); scene.add(t)
    }
    for (const [x, z] of [[-4.7, 6.6], [4.9, 6.4], [-6.8, -5.4], [6.9, -5.6]]) {
      const b = makeBush(0x3d6635, 0.6)
      b.position.set(x, 0, z); scene.add(b)
    }

    // benches facing fountain
    for (const a of [0.2, Math.PI + 0.2]) {
      const b = new THREE.Group()
      b.position.set(Math.cos(a) * 6.2, 0, Math.sin(a) * 6.2)
      b.rotation.y = -a + Math.PI / 2
      box(b, 0x6a4a2e, 2.0, 0.1, 0.5, 0, 0.5, 0, { roughness: 0.7, castShadow: true })
      box(b, 0x6a4a2e, 2.0, 0.45, 0.08, 0, 0.78, -0.22, { roughness: 0.7 })
      for (const x of [-0.8, 0.8]) box(b, 0x2a2a26, 0.08, 0.5, 0.45, x, 0.25, 0)
      scene.add(b)
    }
  }

  buildHouse(level, i, pos) {
    const theme = level.theme
    const group = new THREE.Group()
    group.position.copy(pos)
    const facing = Math.atan2(-pos.x, -pos.z)
    group.rotation.y = facing
    group.userData.houseIndex = i
    this.scene.add(group)

    const palettes = [
      { yard: 0x72a24a, siding: '#e3dac0', trim: 0xf2ead2, roof: '#77503f', door: 0x2f4a32, fence: 0xe6dfcb, flowers: [0xd85a7a, 0xe9b84a, 0xf0e6ea] },
      { yard: 0x5c7636, siding: '#b98468', trim: 0xeadcc0, roof: '#4a2a22', door: 0x3d1414, fence: 0x8a5a42, flowers: [0xb5352b, 0xd86a2a, 0x702020] },
      { yard: 0x5f8a44, siding: '#9fb8a8', trim: 0xd8e0c8, roof: '#46524a', door: 0x224438, fence: 0x8a9a86, flowers: [0x5fe07a, 0x57e6ff, 0xb06aff] },
      { yard: 0x526b3e, siding: '#3a3440', trim: 0x8d8494, roof: '#201b24', door: 0x2a0710, fence: 0x2a242c, flowers: [0xa01830, 0x5a0a18, 0xd8b070] },
    ]
    const pal = palettes[i]

    // lawn
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.16, 12.8), new THREE.MeshStandardMaterial({ map: grassTexture(), color: pal.yard, roughness: 0.98 }))
    lawn.position.set(0, 0.02, 0.35); lawn.receiveShadow = true
    group.add(lawn)
    // walkway
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 6.2), new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.85 }))
    walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.13, 8.4); walk.receiveShadow = true
    group.add(walk)
    // driveway
    const drive = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 10), new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.9 }))
    drive.rotation.x = -Math.PI / 2; drive.position.set(-4.4, 0.12, 7.7); drive.receiveShadow = true
    group.add(drive)

    // house body
    const bodyW = 10.2, bodyD = 8.0, bodyH = 6.2
    const siding = sidingTexture(pal.siding)
    const body = texturedBox(group, siding, bodyW, bodyH, bodyD, 0, bodyH / 2 + 0.04, 0, { roughness: 0.9, castShadow: true })
    // foundation
    box(group, 0x8e8878, bodyW + 0.2, 0.5, bodyD + 0.2, 0, 0.25, 0, { roughness: 0.9, castShadow: true })
    // gables
    gable(group, bodyW, 2.9, bodyD, bodyH + 0.04, bodyD / 2, 0xffffff, siding)
    gable(group, bodyW, 2.9, bodyD, bodyH + 0.04, -bodyD / 2, 0xffffff, siding)
    // roof
    roof(group, bodyW + 0.6, 2.9, bodyD, bodyH + 0.04, shingleTexture(pal.roof), 0xffffff)
    // eave trim
    box(group, pal.trim, bodyW + 0.7, 0.2, 0.2, 0, bodyH + 0.1, bodyD / 2 + 0.05)
    box(group, pal.trim, bodyW + 0.7, 0.2, 0.2, 0, bodyH + 0.1, -bodyD / 2 - 0.05)
    // chimney
    box(group, 0x7a5a4a, 1.1, 3.4, 1.1, -2.9, bodyH + 1.4, -1.5, { roughness: 0.9, castShadow: true })
    box(group, 0x2a201a, 1.3, 0.22, 1.3, -2.9, bodyH + 3.15, -1.5)
    if (i === 1 || i === 3) {
      // smoke
      for (let s = 0; s < 3; s++) {
        const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTexture(), color: i === 3 ? 0x8a7080 : 0x6a5a52, transparent: true, opacity: 0.22, depthWrite: false }))
        sm.position.set(-2.9 + s * 0.3, bodyH + 3.8 + s * 1.2, -1.5)
        sm.scale.set(2.4 + s, 2.4 + s, 1)
        sm.userData.smoke = true; sm.userData.phase = s
        group.add(sm)
      }
    }

    // windows
    const winTex = windowTexture(theme.key)
    const winMat = new THREE.MeshBasicMaterial({ map: winTex, toneMapped: false })
    const addWindow = (x, y, z, ry = 0, w = 1.7, h = 1.55) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; group.add(g)
      box(g, pal.trim, w + 0.26, h + 0.26, 0.1, 0, 0, 0, { roughness: 0.7 })
      plane(g, 0xffffff, w, h, 0, 0, 0.061, { mat: winMat })
      box(g, pal.trim, 0.08, h, 0.12, 0, 0, 0.07)
      box(g, pal.trim, w, 0.08, 0.12, 0, 0, 0.07)
      box(g, pal.trim, w + 0.45, 0.14, 0.28, 0, -h / 2 - 0.15, 0.12)
      if (theme.key !== 'verdant') glow(g, theme.accent, 1.5, 0, 0, 0.18, 0.12)
    }
    addWindow(-2.6, 2.5, bodyD / 2 + 0.01)
    addWindow(2.6, 2.5, bodyD / 2 + 0.01)
    addWindow(-2.6, 4.9, bodyD / 2 + 0.01, 0, 1.35, 1.2)
    addWindow(2.6, 4.9, bodyD / 2 + 0.01, 0, 1.35, 1.2)
    addWindow(-bodyW / 2 - 0.01, 3.1, -1.0, Math.PI / 2)
    addWindow(-bodyW / 2 - 0.01, 4.8, 1.6, Math.PI / 2, 1.2, 1.1)
    addWindow(bodyW / 2 + 0.01, 3.1, -1.0, -Math.PI / 2)

    // porch
    box(group, 0x8a8070, 7.4, 0.28, 2.5, 0, 0.35, bodyD / 2 + 1.2, { roughness: 0.9, castShadow: true })
    for (let s = -1; s <= 1; s += 2) {
      cylinder(group, pal.trim, 0.14, 2.7, s * 3.1, 1.75, bodyD / 2 + 2.15, { low: true, roughness: 0.7, castShadow: true })
    }
    // porch roof
    box(group, pal.trim, 7.6, 0.18, 2.8, 0, 3.15, bodyD / 2 + 1.3, { roughness: 0.7 })
    for (const s of [-1, 1]) {
      box(group, pal.trim, 0.16, 0.5, 2.8, s * 3.7, 2.95, bodyD / 2 + 1.3)
    }
    // steps
    box(group, 0x9a9180, 2.4, 0.16, 0.5, 0, 0.2, bodyD / 2 + 2.6, { roughness: 0.9 })
    box(group, 0x9a9180, 2.4, 0.32, 0.5, 0, 0.08, bodyD / 2 + 3.05, { roughness: 0.9 })

    // door + portal glow
    const doorY = 1.45
    box(group, pal.door, 1.35, 2.6, 0.14, 0, doorY, bodyD / 2 + 0.07, { roughness: 0.55 })
    box(group, pal.trim, 1.6, 2.85, 0.1, 0, doorY, bodyD / 2 + 0.02, { roughness: 0.7 })
    sphere(group, 0xd8b060, 0.065, 0.48, doorY, bodyD / 2 + 0.16)
    const portalGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 2.75), new THREE.MeshBasicMaterial({
      color: theme.portal, transparent: true, opacity: 0.17, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }))
    portalGlow.position.set(0, doorY, bodyD / 2 + 0.14)
    group.add(portalGlow)
    const doorLight = new THREE.PointLight(theme.portal, 4.5, 8, 2)
    doorLight.position.set(0, 1.9, bodyD / 2 + 1.2)
    group.add(doorLight)
    const doorAura = glow(group, theme.portal, 3.6, 0, 1.6, bodyD / 2 + 0.7, 0.22)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.2, 7, 12, 1, true), new THREE.MeshBasicMaterial({
      color: theme.portal, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    }))
    beam.position.set(0, 4.2, bodyD / 2 + 1.4)
    group.add(beam)

    // house number plaque
    const num = level.address.split(' ')[0]
    const plaqueTex = signTexture([num], { w: 256, h: 128, bg: '#20301f', color: '#efe4c4', borderColor: '#d9ca9a', fontSize: 66, distress: true })
    plane(group, 0xffffff, 0.95, 0.48, 0, 2.9, bodyD / 2 + 0.16, { mat: new THREE.MeshBasicMaterial({ map: plaqueTex, toneMapped: false }) })

    // bay window / architectural variation
    if (i === 0 || i === 2) {
      box(group, pal.siding ? 0xffffff : 0xffffff, 2.2, 2.0, 0.8, -3.9, 1.5, bodyD / 2 + 0.35, { roughness: 0.85, castShadow: true })
      box(group, pal.trim, 2.4, 0.14, 1.0, -3.9, 2.55, bodyD / 2 + 0.38)
    }
    if (i === 3) {
      // columns and balcony
      for (const s of [-1, 1]) cylinder(group, 0x6a6068, 0.23, 5.6, s * 3.9, 2.8, bodyD / 2 + 1.8, { low: true, roughness: 0.6, castShadow: true })
      box(group, 0x2a242c, 8.4, 0.28, 2.8, 0, 5.6, bodyD / 2 + 1.9)
      for (let b = -3; b <= 3; b++) box(group, 0x4a4250, 0.12, 0.9, 0.12, b, 6.05, bodyD / 2 + 3.0)
    }
    if (i === 1) {
      // scorched gable cross
      box(group, 0x2a0a0a, 0.25, 2.2, 0.1, 0, bodyH + 1.4, bodyD / 2 + 0.04)
      box(group, 0x2a0a0a, 1.5, 0.25, 0.1, 0, bodyH + 1.9, bodyD / 2 + 0.04)
    }

    // mailbox + lawn sign
    const mailbox = makeMailbox(i === 1 ? 0x5a2a22 : i === 3 ? 0x2a242c : 0x4a5a48)
    mailbox.position.set(4.9, 0, 7.2); group.add(mailbox)
    const lawnSign = new THREE.Group(); lawnSign.position.set(-5.1, 0, 7.0); lawnSign.rotation.y = 0; group.add(lawnSign)
    box(lawnSign, 0x3a2a1a, 0.1, 1.0, 0.1, -0.55, 0.5, 0)
    box(lawnSign, 0x3a2a1a, 0.1, 1.0, 0.1, 0.55, 0.5, 0)
    box(lawnSign, 0x1e2a1c, 1.3, 0.7, 0.07, 0, 0.92, 0, { roughness: 0.7 })
    plane(lawnSign, 0xffffff, 1.18, 0.58, 0, 0.92, 0.05, { mat: new THREE.MeshBasicMaterial({ map: signTexture(['OPEN', 'HOUSE'], { w: 320, h: 160, bg: '#1e2a1c', color: '#b8ff3d', borderColor: '#b8ff3d', fontSize: 52, distress: true }), toneMapped: false }) })

    // fence
    fence(group, pal.fence, i === 3 ? 1.2 : 0.9, i === 3 || i === 1)

    // yard landscaping
    const tree1 = makeTree({ scale: i === 1 ? 1.0 : 0.95, dead: i === 1, color: i === 2 ? 0x4f8a42 : 0x3f6b3a })
    tree1.position.set(i % 2 === 0 ? 5.2 : -5.2, 0, i % 2 === 0 ? -3.2 : -3.6)
    group.add(tree1)
    const tree2 = makeTree({ scale: 0.7, dead: false, color: 0x46703a })
    tree2.position.set(-5.4, 0, 3.8); group.add(tree2)
    for (let b = 0; b < 4; b++) {
      const bush = makeBush(b % 2 ? 0x3d6635 : 0x4a7440, 0.42 + (b % 3) * 0.08)
      bush.position.set(-3.7 + b * 2.45, 0, -4.7); group.add(bush)
    }
    makeFlowerbed(group, -4.3, 6.0, pal.flowers[0], 8)
    makeFlowerbed(group, 4.3, 6.0, pal.flowers[1], 8)
    for (let f = 0; f < 15; f++) {
      const fx = -5.5 + Math.random() * 11, fz = 5.9 + Math.random() * 0.7
      sphere(group, pal.flowers[Math.floor(Math.random() * pal.flowers.length)], 0.06, fx, 0.15, fz, { low: true, roughness: 0.9 })
    }

    if (i === 0 || i === 2) {
      const car = makeCar(i === 0 ? 0x8a3a34 : 0x3a5a6a)
      car.position.set(-4.4, 0.12, 8.1); car.rotation.y = 0.02
      group.add(car)
    }
    if (i === 1) {
      // dead shrubs and embers
      for (let e = 0; e < 16; e++) {
        const ember = glow(group, 0xff6a2a, 0.16, -6 + Math.random() * 12, 0.2 + Math.random() * 1.2, -5 + Math.random() * 11, 0.6)
        ember.userData.ember = { baseY: ember.position.y, phase: Math.random() * 6.28, speed: 0.4 + Math.random() * 0.7 }
        group.userData.embers = group.userData.embers || []
        group.userData.embers.push(ember)
      }
      for (let c = 0; c < 3; c++) {
        const crack = box(group, 0xff3a10, 0.8 + Math.random(), 0.02, 0.09, -4 + Math.random() * 8, 0.16, -3 + Math.random() * 8, { emissive: 0xff2a00, emissiveIntensity: 2.4, rotY: Math.random() * 3 })
      }
    }
    if (i === 2) {
      // toxic barrels and glowing pool
      for (let b = 0; b < 3; b++) {
        const barrel = new THREE.Group()
        barrel.position.set(3.6 + b * 1.0, 0, -3.7 + (b % 2) * 0.8)
        cylinder(barrel, 0x4a5a2a, 0.36, 1.05, 0, 0.53, 0)
        torus(barrel, 0x2a3a1a, 0.36, 0.03, 0, 0.3, 0, { rotX: Math.PI / 2 })
        torus(barrel, 0x2a3a1a, 0.36, 0.03, 0, 0.8, 0, { rotX: Math.PI / 2 })
        glow(barrel, 0x6aff3a, 1.2, 0, 0.9, 0, 0.25)
        group.add(barrel)
      }
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1.5, 28), new THREE.MeshStandardMaterial({ color: 0x2a7a3a, emissive: 0x3aff2a, emissiveIntensity: 0.35, roughness: 0.15, transparent: true, opacity: 0.85 }))
      pool.rotation.x = -Math.PI / 2; pool.position.set(4.9, 0.17, -1.0); group.add(pool)
      torus(group, 0x6a7258, 1.6, 0.18, 4.9, 0.22, -1.0, { rotX: Math.PI / 2 })
      glow(group, 0x5aff3a, 4, 4.9, 0.5, -1.0, 0.18)
    }
    if (i === 3) {
      for (let gx = 0; gx < 2; gx++) {
        const g = new THREE.Group(); g.position.set(-5.2 + gx * 10.4, 2.2, 4.4); group.add(g)
        box(g, 0x1a161c, 0.8, 0.8, 1.2, 0, 0, 0)
        cone(g, 0x3a2a32, 0.2, 0.5, -0.2, 0.55, 0.2); cone(g, 0x3a2a32, 0.2, 0.5, 0.2, 0.55, 0.2)
        glow(g, 0xff2010, 0.6, -0.18, 0.1, 0.62, 0.8); glow(g, 0xff2010, 0.6, 0.18, 0.1, 0.62, 0.8)
      }
    }

    // plumbob + selection ring
    const plum = makePlumbob(i === 0 ? 0x67d94f : i === 1 ? 0xff5a24 : i === 2 ? 0x57e6ff : 0xff2a4a, 0.55)
    plum.position.set(0, 11.4, 0)
    group.add(plum)
    const ringMat = new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
    const ring = new THREE.Mesh(new THREE.RingGeometry(6.5, 6.9, 48), ringMat)
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.09
    group.add(ring)

    // interior glow from front door area
    glow(group, theme.accent, 5, 0, 1.4, bodyD / 2 + 0.4, 0.08)

    return {
      index: i, level, group, pos, facing,
      plumbob: plum, ring, ringMat, portalGlow, doorLight, doorAura, beam, pal,
      labelY: 12.4, cleared: this.save?.cleared?.includes(level.id),
    }
  }

  update(dt) {
    this.time += dt
    const t = this.time
    // gentle auto orbit unless user interacted recently
    if (!this.dragging && performance.now() - this.lastInteract > 5000) {
      this.orbit.angle += dt * 0.012
    }
    this.orbit.radius += (this.orbit.targetRadius - this.orbit.radius) * Math.min(1, dt * 3)
    this.orbit.height += (this.orbit.targetHeight - this.orbit.height) * Math.min(1, dt * 3)
    const r = this.orbit.radius
    this.camera.position.set(Math.cos(this.orbit.angle) * r, this.orbit.height + Math.sin(t * 0.3) * 0.35, Math.sin(this.orbit.angle) * r)
    this.camera.lookAt(0, 2.2, 0)

    // cloud drift
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt * 2
      if (c.position.x > 150) c.position.x = -150
    }
    // fireflies
    for (const f of this.fireflies) {
      const o = f.userData.orbit
      o.a += dt * o.speed * 0.4
      f.position.set(Math.cos(o.a) * o.r, o.y + Math.sin(t * 1.4 + o.r) * 0.4, Math.sin(o.a) * o.r)
      f.material.opacity = 0.35 + Math.abs(Math.sin(t * 2.2 + o.r)) * 0.5
    }
    // fountain
    if (this.fountain) {
      this.fountain.water.rotation.z += dt * 0.06
      this.fountain.plum.rotation.y += dt * 1.4
      this.fountain.plum.position.y = 2.0 + Math.sin(t * 1.6) * 0.08
    }
    if (this.signPlumbob) { this.signPlumbob.rotation.y += dt * 1.1; this.signPlumbob.position.y = 3.65 + Math.sin(t * 1.7) * 0.08 }

    // houses
    for (const h of this.houses) {
      const isHover = this.hovered === h.index
      const isSel = this.selected === h.index
      const active = isHover || isSel
      const targetScale = active ? 1.2 : 1
      h.plumbob.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1, dt * 8))
      h.plumbob.rotation.y += dt * (active ? 2.2 : 1.0)
      h.plumbob.position.y = 11.4 + Math.sin(t * 1.5 + h.index) * 0.2
      h.plumbob.userData.spin.rotation.y += dt * 2
      h.plumbob.userData.ring.rotation.z += dt * 1.4
      h.ringMat.opacity = active ? 0.5 : (h.cleared ? 0.12 : 0.08)
      h.ring.rotation.z += dt * (active ? 0.4 : 0.08)
      h.portalGlow.material.opacity = 0.12 + Math.abs(Math.sin(t * 1.7 + h.index)) * (active ? 0.3 : 0.1)
      h.doorLight.intensity = 3.5 + Math.abs(Math.sin(t * 1.7 + h.index)) * (active ? 5 : 2)
      h.doorAura.material.opacity = 0.14 + Math.abs(Math.sin(t * 1.7 + h.index)) * (active ? 0.18 : 0.06)
      h.beam.material.opacity = active ? 0.09 : 0.03
      if (h.group.userData.embers) {
        for (const e of h.group.userData.embers) {
          const o = e.userData.ember
          e.position.y = o.baseY + Math.sin(t * o.speed + o.phase) * 0.3
          e.material.opacity = 0.3 + Math.abs(Math.sin(t * o.speed * 2 + o.phase)) * 0.5
        }
      }
      h.group.traverse(o => { if (o.userData.smoke) { o.position.y = 9.8 + o.userData.phase * 1.2 + (t * 0.3) % 1; o.material.opacity = 0.18 - (o.userData.phase * 0.04) } })
    }
  }

  setHover(index) {
    if (this.hovered !== index) {
      this.hovered = index
      this.lastInteract = performance.now()
    }
  }

  setSelected(index) {
    this.selected = index
    this.lastInteract = performance.now()
  }

  pick(ndc) {
    this.raycaster.setFromCamera(ndc, this.camera)
    const hits = this.raycaster.intersectObjects(this.houses.map(h => h.group), true)
    for (const hit of hits) {
      let o = hit.object
      while (o) {
        if (o.userData?.houseIndex !== undefined) return o.userData.houseIndex
        o = o.parent
      }
    }
    return -1
  }

  labelScreen(index) {
    const h = this.houses[index]
    if (!h) return null
    const v = new THREE.Vector3(0, h.labelY, 0)
    h.group.localToWorld(v)
    v.project(this.camera)
    return { x: (v.x * 0.5 + 0.5) * 100, y: (-v.y * 0.5 + 0.5) * 100, visible: v.z < 1 }
  }

  markCleared(levelId) {
    for (const h of this.houses) {
      if (h.level.id !== levelId) continue
      if (h.cleared) return
      h.cleared = true
      h.ringMat.color.setHex(0xffd166)
      h.plumbob.visible = false
      // gold marker
      const star = makePlumbob(0xffd166, 0.5)
      star.position.set(0, 11.4, 0)
      h.group.add(star)
      h.plumbob = star
      h.ringMat.color.setHex(0xffd166)
      return
    }
  }

  handleDrag(dx, dy) {
    this.dragging = true
    this.lastInteract = performance.now()
    this.orbit.angle += dx * 0.005
    this.orbit.height = THREE.MathUtils.clamp(this.orbit.height + dy * 0.12, 14, 45)
    this.orbit.targetHeight = this.orbit.height
  }

  endDrag() {
    this.dragging = false
    this.lastInteract = performance.now()
  }

  zoom(delta) {
    this.orbit.targetRadius = THREE.MathUtils.clamp(this.orbit.targetRadius + delta * 0.02, 25, 58)
    this.lastInteract = performance.now()
  }

  resetView() {
    this.orbit.targetRadius = 47
    this.orbit.targetHeight = 33
  }
}

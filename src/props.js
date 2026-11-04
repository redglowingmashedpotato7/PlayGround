import * as THREE from 'three'
import { box, cylinder, sphere, cone, ico, torus, plane, glow, material, basicMaterial, light, shadowBlob } from './art.js'
import { rugTexture, tvStaticTexture, neonTexture, bloodTexture, metalTexture, flameTexture, starfieldTexture } from './textures.js'

const WOOD = 0x5b3a22
const DARK = 0x2b1b10
const METAL = 0x5c6462
const BRASS = 0xb08a44

function texturedPlane(parent, texture, w, h, x, y, z, opts = {}) {
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide, toneMapped: false, depthWrite: opts.depthWrite ?? true })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
  m.scale.set(w, h, 1); m.position.set(x, y, z)
  if (opts.rotX !== undefined) m.rotation.x = opts.rotX
  if (opts.rotY) m.rotation.y = opts.rotY
  if (opts.rotZ) m.rotation.z = opts.rotZ
  m.renderOrder = opts.renderOrder ?? 0
  parent.add(m)
  return m
}

function emissivePlane(parent, color, w, h, x, y, z, opts = {}) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1, blending: opts.blending ?? THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: opts.side ?? THREE.FrontSide })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
  m.scale.set(w, h, 1); m.position.set(x, y, z)
  if (opts.rotX !== undefined) m.rotation.x = opts.rotX
  if (opts.rotY) m.rotation.y = opts.rotY
  m.renderOrder = opts.renderOrder ?? 2
  parent.add(m)
  return m
}

function flame(parent, x, y, z, size = 0.5, color = 0xff8a2a) {
  const mat = new THREE.SpriteMaterial({ map: flameTexture(), color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const s = new THREE.Sprite(mat)
  s.scale.set(size, size * 1.7, 1); s.position.set(x, y, z)
  parent.add(s)
  return s
}

function fireShader(colorA, colorB) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uA: { value: new THREE.Color(colorA) },
      uB: { value: new THREE.Color(colorB) },
    },
    transparent: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform vec3 uA; uniform vec3 uB;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 uv=vUv*3.0;
        float n=noise(uv*2.0+vec2(uTime*.18,uTime*.35));
        n+=0.5*noise(uv*4.0-vec2(uTime*.3,uTime*.2));
        float band=smoothstep(0.25,0.95,n*0.7+0.2+0.15*sin(uv.y*4.0+uTime));
        vec3 c=mix(uA,uB,band);
        float edge=1.0-smoothstep(0.42,0.5,max(abs(vUv.x-.5),abs(vUv.y-.5)));
        c=mix(c*0.55,c,edge);
        gl_FragColor=vec4(c,1.0);
      }`,
  })
}

/* ------------------------------------------------------------------ */
/* Individual props                                                    */
/* ------------------------------------------------------------------ */

function sofa(o = {}) {
  const g = new THREE.Group()
  const c = o.color ?? 0x6f4a32
  box(g, c, 2.6, 0.42, 1.15, 0, 0.34, 0, { roughness: 0.95 })
  box(g, c, 2.6, 0.86, 0.24, 0, 0.8, -0.46, { roughness: 0.95 })
  box(g, c, 0.22, 0.52, 1.1, -1.2, 0.6, 0, { roughness: 0.95 })
  box(g, c, 0.22, 0.52, 1.1, 1.2, 0.6, 0, { roughness: 0.95 })
  for (let i = -1; i <= 1; i++) box(g, o.cushion ?? 0x8a6247, 0.72, 0.16, 0.86, i * 0.78, 0.57, 0.04, { roughness: 0.98 })
  for (const x of [-1.1, 1.1]) for (const z of [-0.44, 0.44]) box(g, DARK, 0.1, 0.16, 0.1, x, 0.08, z)
  if (o.blood) { plane(g, 0x5a0b0d, 0.9, 0.7, 0.6, 0.63, 0.05, { rotX: -Math.PI / 2, transparent: true, opacity: 0.6, basic: true, depthWrite: false }) }
  return g
}

function armchair(o = {}) {
  const g = new THREE.Group(); const c = o.color ?? 0x7a4b35
  box(g, c, 1.15, 0.4, 1.05, 0, 0.32, 0, { roughness: 0.95 })
  box(g, c, 1.15, 0.9, 0.22, 0, 0.78, -0.42, { roughness: 0.95 })
  box(g, c, 0.18, 0.5, 1.0, -0.48, 0.58, 0, { roughness: 0.95 })
  box(g, c, 0.18, 0.5, 1.0, 0.48, 0.58, 0, { roughness: 0.95 })
  box(g, o.cushion ?? 0x9a7350, 0.82, 0.15, 0.8, 0, 0.55, 0.04, { roughness: 0.98 })
  return g
}

function coffeeTable(o = {}) {
  const g = new THREE.Group()
  box(g, o.color ?? WOOD, 2.2, 0.09, 1.15, 0, 0.44, 0, { roughness: 0.5 })
  for (const x of [-0.94, 0.94]) for (const z of [-0.44, 0.44]) box(g, DARK, 0.08, 0.42, 0.08, x, 0.21, z)
  box(g, 0x8a6a4a, 0.42, 0.03, 0.3, -0.55, 0.5, 0, { rotY: 0.2 })
  box(g, 0x384a42, 0.3, 0.06, 0.22, 0.4, 0.52, 0.1)
  cylinder(g, 0xd8cfb0, 0.09, 0.12, 0.7, 0.53, -0.25, { low: true })
  return g
}

function rug(o = {}) {
  const g = new THREE.Group()
  const w = o.w ?? 4, d = o.d ?? 2.8
  texturedPlane(g, rugTexture(o.kind ?? 'persian'), w, d, 0, 0.022, 0, { rotX: -Math.PI / 2 })
  return g
}

function tv(o = {}) {
  const g = new THREE.Group()
  box(g, DARK, 2.1, 0.55, 0.55, 0, 0.28, 0, { roughness: 0.6 })
  box(g, 0x1a1c18, 1.65, 1.2, 0.72, 0, 1.1, 0, { roughness: 0.55, metalness: 0.2 })
  const screen = texturedPlane(g, tvStaticTexture(), 1.4, 0.96, 0, 1.12, 0.372, { transparent: false })
  screen.material.color.setHex(0x8affc8)
  glow(g, 0x62ffb0, 1.7, 0, 1.1, 0.6, 0.17)
  box(g, 0x0e100e, 0.5, 0.1, 0.35, 0.5, 1.69, 0.1)
  const update = (t) => {
    screen.material.opacity = 0.82 + Math.sin(t * 31) * 0.1 + Math.random() * 0.08
  }
  g.userData.update = update
  return g
}

function bookshelf(o = {}) {
  const g = new THREE.Group()
  box(g, DARK, 1.6, 2.5, 0.42, 0, 1.25, 0, { roughness: 0.7 })
  for (let i = 0; i < 5; i++) box(g, 0x3d2818, 1.48, 0.06, 0.38, 0, 0.25 + i * 0.5, 0.02)
  const rand = () => Math.random()
  const colors = [0x6b2b23, 0x2f4b3a, 0x3a3f63, 0x6b5230, 0x59315e, 0x8a7a52]
  for (let i = 0; i < 26; i++) {
    const row = Math.floor(rand() * 5)
    const x = -0.64 + (i % 11) * 0.115 + rand() * 0.03
    const h = 0.28 + rand() * 0.12
    box(g, colors[Math.floor(rand() * colors.length)], 0.075, h, 0.24, x, 0.34 + row * 0.5 + h / 2, 0.06, { rotZ: (rand() - .5) * .12 })
  }
  return g
}

function fireplace(o = {}) {
  const g = new THREE.Group()
  box(g, 0x6f6658, 2.7, 1.75, 0.62, 0, 0.87, 0, { roughness: 0.9 })
  box(g, 0x1a1210, 1.5, 1.0, 0.16, 0, 0.62, 0.32)
  box(g, 0x2e1a12, 2.95, 0.16, 0.86, 0, 1.78, 0, { roughness: 0.5 })
  box(g, 0x8a7b62, 2.9, 0.14, 0.8, 0, 1.9, 0, { roughness: 0.6 })
  cylinder(g, 0x2a1810, 0.1, 1.2, -0.28, 0.28, 0.34, { rotZ: Math.PI / 2, low: true })
  cylinder(g, 0x2a1810, 0.09, 1.0, 0.25, 0.3, 0.34, { rotZ: Math.PI / 2, low: true })
  const f1 = flame(g, 0, 0.7, 0.36, 0.58)
  const f2 = flame(g, -0.24, 0.56, 0.34, 0.4, 0xffc04a)
  const f3 = flame(g, 0.24, 0.56, 0.36, 0.42, 0xff5a22)
  light(g, 0xff7a2a, 4.5, 4.8, 0, 0.9, 0.7)
  g.userData.update = (t) => {
    const f = 0.93 + Math.sin(t * 17) * 0.06 + Math.random() * 0.06
    f1.scale.set(0.58 * f, 0.96 * f, 1); f2.scale.set(0.4 * f, 0.66 * f, 1); f3.scale.set(0.42 * f, 0.7 * f, 1)
  }
  return g
}

function plant(o = {}) {
  const g = new THREE.Group()
  cylinder(g, 0x8c5b3a, 0.32, 0.46, 0, 0.23, 0, { roughness: 0.9 })
  cylinder(g, 0x3a2114, 0.27, 0.06, 0, 0.47, 0)
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2
    cylinder(g, 0x2d5c2d, 0.03, 0.7 + Math.random() * 0.4, Math.cos(a) * 0.12, 0.75, Math.sin(a) * 0.12, { rotX: Math.sin(a) * 0.5, rotZ: -Math.cos(a) * 0.5, low: true })
    ico(g, i % 2 ? 0x3f7d3a : 0x2f6630, 0.28 + Math.random() * 0.14, Math.cos(a) * 0.36, 1.15 + Math.random() * 0.25, Math.sin(a) * 0.36, { low: true, flatShading: true, roughness: 0.9 })
  }
  return g
}

function pottedPalm(o = {}) {
  const g = new THREE.Group()
  cylinder(g, 0x7a4f34, 0.4, 0.58, 0, 0.29, 0, { roughness: 0.9 })
  cylinder(g, 0x42281a, 0.51, 0.09, 0, 0.06, 0)
  cylinder(g, 0x6a5230, 0.08, 2.4, 0, 1.6, 0, { low: true })
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2
    const leaf = ico(g, i % 2 ? 0x3f7040 : 0x4c7f45, 0.52, Math.cos(a) * 0.62, 2.55 + Math.sin(i) * 0.18, Math.sin(a) * 0.62, { low: true, flatShading: true })
    leaf.scale.set(0.55, 0.12, 0.28); leaf.rotation.y = a; leaf.rotation.z = -0.45
  }
  return g
}

function consoleTable() {
  const g = new THREE.Group()
  box(g, WOOD, 1.9, 0.08, 0.55, 0, 0.78, 0, { roughness: 0.5 })
  for (const x of [-0.8, 0.8]) for (const z of [-0.18, 0.18]) box(g, DARK, 0.07, 0.76, 0.07, x, 0.38, z)
  cylinder(g, BRASS, 0.16, 0.32, 0, 0.98, 0)
  cylinder(g, 0xe8dcb0, 0.22, 0.18, 0, 1.18, 0, { emissive: 0xffdba0, emissiveIntensity: 0.4 })
  const shade = cone(g, 0xd8cba8, 0.32, 0.26, 0, 1.3, 0, { transparent: true, opacity: 0.9, emissive: 0xffe0a0, emissiveIntensity: 0.4 })
  shade.rotation.x = Math.PI
  return g
}

function kitchenCounter(o = {}) {
  const g = new THREE.Group()
  box(g, 0x4a3220, 3.0, 0.82, 0.62, 0, 0.41, 0, { roughness: 0.8 })
  box(g, 0xd8d0b8, 3.08, 0.08, 0.7, 0, 0.86, 0, { roughness: 0.32 })
  for (let i = 0; i < 3; i++) {
    box(g, 0x5a3f28, 0.92, 0.64, 0.05, -1 + i, 0.45, 0.33)
    box(g, BRASS, 0.16, 0.03, 0.03, -1 + i, 0.52, 0.37)
  }
  // sink
  box(g, 0x8a8f88, 0.7, 0.04, 0.42, 0.7, 0.91, 0, { metalness: 0.7, roughness: 0.25 })
  cylinder(g, 0xb8bcb0, 0.03, 0.35, 0.7, 1.05, -0.22, { low: true, metalness: 0.7 })
  // kettle
  cylinder(g, 0xb84a2a, 0.16, 0.22, -0.8, 1.0, 0)
  return g
}

function islandCounter() {
  const g = new THREE.Group()
  box(g, 0x4a3220, 2.4, 0.86, 1.1, 0, 0.43, 0, { roughness: 0.8 })
  box(g, 0xe0d8c0, 2.5, 0.09, 1.18, 0, 0.9, 0, { roughness: 0.3 })
  cylinder(g, 0xcfc0a0, 0.32, 0.08, 0.2, 0.98, 0)
  for (let i = 0; i < 4; i++) sphere(g, i % 2 ? 0x9a2a22 : 0xc9b03a, 0.1, 0.2 + Math.cos(i * 1.7) * 0.14, 1.04, Math.sin(i * 1.7) * 0.14)
  cylinder(g, 0xd8d0b8, 0.08, 0.24, -0.7, 1.05, 0)
  return g
}

function fridge() {
  const g = new THREE.Group()
  box(g, 0xa8ada3, 1.0, 2.3, 0.78, 0, 1.15, 0, { metalness: 0.35, roughness: 0.42 })
  box(g, 0x8f948c, 1.02, 0.04, 0.8, 0, 1.55, 0)
  box(g, 0x7f847c, 0.04, 1.2, 0.05, 0.34, 1.3, 0.4)
  box(g, 0x7f847c, 0.04, 0.3, 0.05, 0.34, 0.65, 0.4)
  const magnet = box(g, 0xc94a2a, 0.1, 0.12, 0.02, -0.22, 1.5, 0.4)
  box(g, 0x3a6a8a, 0.08, 0.1, 0.02, 0.04, 1.72, 0.4)
  return g
}

function stove() {
  const g = new THREE.Group()
  box(g, 0x9a9e94, 0.98, 1.0, 0.7, 0, 0.5, 0, { metalness: 0.35, roughness: 0.4 })
  box(g, 0x22201e, 0.8, 0.32, 0.04, 0, 0.46, 0.36)
  for (const x of [-0.25, 0.25]) for (const z of [-0.18, 0.18]) torus(g, 0x2a2a28, 0.14, 0.025, x, 1.03, z, { rotX: Math.PI / 2 })
  box(g, 0x101010, 0.7, 0.06, 0.5, 0, 1.03, 0)
  return g
}

function diningTable(o = {}) {
  const g = new THREE.Group()
  const w = o.small ? 2.2 : 3.0
  box(g, o.color ?? WOOD, w, 0.1, 1.45, 0, 0.78, 0, { roughness: 0.45 })
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) for (const z of [-0.55, 0.55]) box(g, DARK, 0.12, 0.76, 0.12, x, 0.38, z)
  if (!o.small) {
    cylinder(g, 0xe0d8c0, 0.26, 0.02, -0.55, 0.84, 0)
    cylinder(g, 0xe0d8c0, 0.22, 0.02, 0.45, 0.84, 0.2)
    const candle = cylinder(g, 0xe8e0c0, 0.04, 0.34, 0, 0.98, 0, { emissive: 0xffd090, emissiveIntensity: 0.35 })
    flame(g, 0, 1.2, 0, 0.2)
    light(g, 0xffb060, 2.2, 3.5, 0, 1.1, 0)
  }
  return g
}

function chair(o = {}) {
  const g = new THREE.Group(); const c = o.color ?? WOOD
  box(g, c, 0.46, 0.06, 0.46, 0, 0.46, 0)
  box(g, c, 0.46, 0.62, 0.06, 0, 0.78, -0.2)
  for (const x of [-0.19, 0.19]) for (const z of [-0.19, 0.19]) box(g, DARK, 0.05, 0.46, 0.05, x, 0.23, z)
  return g
}

function sideboard() {
  const g = new THREE.Group()
  box(g, WOOD, 2.1, 0.9, 0.55, 0, 0.45, 0, { roughness: 0.55 })
  box(g, 0x6b4a2e, 2.2, 0.07, 0.6, 0, 0.92, 0, { roughness: 0.4 })
  for (let i = 0; i < 3; i++) { box(g, 0x3d2818, 0.62, 0.7, 0.03, -0.68 + i * 0.68, 0.48, 0.29); sphere(g, BRASS, 0.045, -0.68 + i * 0.68, 0.5, 0.32) }
  cylinder(g, 0xd8cfb0, 0.16, 0.3, 0.55, 1.08, 0)
  return g
}

function poolTable() {
  const g = new THREE.Group()
  box(g, 0x3a2315, 2.9, 0.32, 1.7, 0, 0.72, 0, { roughness: 0.6 })
  box(g, 0x1f6b3f, 2.55, 0.07, 1.38, 0, 0.91, 0, { roughness: 0.95 })
  for (const x of [-1.2, 1.2]) for (const z of [-0.7, 0.7]) box(g, 0x2a170e, 0.18, 0.62, 0.18, x, 0.36, z)
  for (const x of [-1.2, 1.2]) for (const z of [-0.7, 0.7]) torus(g, 0x0d0c0a, 0.11, 0.03, x, 0.93, z, { rotX: Math.PI / 2 })
  const rand = (i) => Math.sin(i * 91.7) * 0.5 + 0.5
  for (let i = 0; i < 9; i++) sphere(g, [0xffffff, 0xe0b020, 0x2a4ca0, 0xb02020, 0x101010, 0xe07020, 0x30a050, 0x702060, 0x205050][i], 0.065, -0.5 + rand(i) * 1.0, 0.98, -0.24 + rand(i + 4) * 0.48)
  cylinder(g, 0xb08a44, 0.015, 1.2, 0.6, 0.99, 0.1, { rotZ: Math.PI / 2 })
  return g
}

function bar() {
  const g = new THREE.Group()
  box(g, DARK, 2.6, 1.05, 0.7, 0, 0.53, 0, { roughness: 0.55 })
  box(g, 0x6a4326, 2.75, 0.1, 0.86, 0, 1.1, 0, { roughness: 0.35 })
  for (let i = 0; i < 7; i++) {
    const col = [0x2a6b4a, 0x8a4a1a, 0x4a2a6a, 0xc9a02a][i % 4]
    cylinder(g, col, 0.05, 0.3, -1.05 + i * 0.32, 1.3, -0.1, { emissive: col, emissiveIntensity: 0.15 })
    cylinder(g, col, 0.028, 0.12, -1.05 + i * 0.32, 1.51, -0.1)
  }
  for (let i = 0; i < 3; i++) { cylinder(g, BRASS, 0.05, 0.32, 0.8 + i * 0.12, 0.22, 0.6, { low: true }) }
  return g
}

function bed(o = {}) {
  const g = new THREE.Group()
  box(g, DARK, 2.35, 0.3, 3.6, 0, 0.3, 0, { roughness: 0.6 })
  box(g, 0xd8d0bc, 2.1, 0.32, 3.2, 0, 0.55, 0, { roughness: 0.95 })
  box(g, o.color ?? 0x3f5f4a, 2.15, 0.14, 1.7, 0, 0.75, 0.62, { roughness: 0.98 })
  box(g, 0xe4dcc8, 1.7, 0.22, 0.7, 0, 0.78, -1.2, { roughness: 0.98 })
  box(g, 0xd0c4aa, 0.6, 0.24, 0.42, -0.45, 0.82, -1.2, { roughness: 0.98 })
  box(g, DARK, 2.45, 1.1, 0.16, 0, 0.85, -1.78)
  for (const x of [-1.1, 1.1]) box(g, DARK, 0.12, 0.85, 0.12, x, 0.43, -1.68)
  return g
}

function wardrobe() {
  const g = new THREE.Group()
  box(g, DARK, 2.1, 2.6, 0.7, 0, 1.3, 0, { roughness: 0.55 })
  box(g, 0x4a2e1b, 0.98, 2.45, 0.04, -0.51, 1.3, 0.37)
  box(g, 0x4a2e1b, 0.98, 2.45, 0.04, 0.51, 1.3, 0.37)
  sphere(g, BRASS, 0.04, -0.08, 1.3, 0.4); sphere(g, BRASS, 0.04, 0.08, 1.3, 0.4)
  box(g, 0x2a1a0e, 2.2, 0.12, 0.8, 0, 2.62, 0)
  return g
}

function dresser() {
  const g = new THREE.Group()
  box(g, WOOD, 2.0, 1.0, 0.6, 0, 0.5, 0, { roughness: 0.55 })
  for (let i = 0; i < 3; i++) { box(g, 0x3d2818, 0.88, 0.25, 0.04, -0.48, 0.26 + i * 0.28, 0.31); box(g, 0x3d2818, 0.88, 0.25, 0.04, 0.48, 0.26 + i * 0.28, 0.31) }
  cylinder(g, 0x8a4a3a, 0.14, 0.22, 0.6, 1.12, 0)
  sphere(g, 0xc9a05a, 0.12, 0.6, 1.36, 0)
  return g
}

function chandelier() {
  const g = new THREE.Group()
  cylinder(g, DARK, 0.03, 0.9, 0, 2.95, 0, { low: true })
  torus(g, BRASS, 0.5, 0.035, 0, 2.55, 0, { rotX: Math.PI / 2 })
  cylinder(g, BRASS, 0.08, 0.3, 0, 2.7, 0)
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2
    cylinder(g, BRASS, 0.025, 0.5, Math.cos(a) * 0.5, 2.55, Math.sin(a) * 0.5, { low: true })
    cylinder(g, 0xf0e4b0, 0.045, 0.22, Math.cos(a) * 0.5, 2.72, Math.sin(a) * 0.5, { emissive: 0xffdda0, emissiveIntensity: 0.9 })
    flame(g, Math.cos(a) * 0.5, 2.86, Math.sin(a) * 0.5, 0.16, 0xffd080)
  }
  glow(g, 0xffc86a, 2.2, 0, 2.6, 0, 0.16)
  const bulb = light(g, 0xffc070, 5.2, 8, 0, 2.55, 0)
  g.userData.update = (t) => { bulb.intensity = 4.4 + Math.sin(t * 3.1) * 0.6 }
  return g
}

function ceilingFan() {
  const g = new THREE.Group()
  cylinder(g, DARK, 0.025, 0.8, 0, 3.0, 0, { low: true })
  const hub = new THREE.Group(); hub.position.y = 2.6; g.add(hub)
  cylinder(hub, METAL, 0.16, 0.18, 0, 0, 0)
  for (let i = 0; i < 4; i++) {
    const b = box(hub, 0x6b4a2e, 1.25, 0.035, 0.32, Math.cos(i * Math.PI / 2) * 0.62, 0, Math.sin(i * Math.PI / 2) * 0.62)
    b.rotation.y = -i * Math.PI / 2
  }
  // pendant
  cylinder(g, DARK, 0.02, 0.5, 0, 2.35, 0, { low: true })
  cone(g, 0xd8cba8, 0.28, 0.25, 0, 2.18, 0, { transparent: true, opacity: 0.85, emissive: 0xffdca0, emissiveIntensity: 0.4 })
  glow(g, 0xffc070, 1.4, 0, 2.18, 0, 0.13)
  g.userData.update = (t, dt) => { hub.rotation.y += dt * 1.7 }
  return g
}

function candles() {
  const g = new THREE.Group()
  for (let i = 0; i < 5; i++) {
    const h = 0.3 + (i % 3) * 0.18
    cylinder(g, 0xe8e0c8, 0.09, h, Math.cos(i * 2) * 0.3, h / 2, Math.sin(i * 2) * 0.3, { emissive: 0xffcf90, emissiveIntensity: 0.2 })
    flame(g, Math.cos(i * 2) * 0.3, h + 0.1, Math.sin(i * 2) * 0.3, 0.14)
  }
  light(g, 0xffa050, 2.0, 4, 0, 0.6, 0)
  return g
}

function bones() {
  const g = new THREE.Group()
  const bone = 0xd8cfb8
  for (let i = 0; i < 6; i++) {
    const a = i * 1.3
    cylinder(g, bone, 0.045, 0.7 + Math.random() * 0.3, Math.cos(a) * 0.35, 0.06, Math.sin(a) * 0.35, { rotZ: Math.PI / 2, rotY: a, low: true })
    sphere(g, bone, 0.07, Math.cos(a) * 0.55, 0.06, Math.sin(a) * 0.55)
  }
  sphere(g, 0xe0d6c0, 0.18, 0, 0.16, 0)
  box(g, 0x2a2018, 0.06, 0.06, 0.04, -0.06, 0.17, 0.16)
  box(g, 0x2a2018, 0.06, 0.06, 0.04, 0.06, 0.17, 0.16)
  box(g, 0x2a2018, 0.18, 0.03, 0.02, 0, 0.09, 0.18)
  return g
}

function bloodRug(o = {}) {
  const g = new THREE.Group()
  const w = o.w ?? 3, d = o.d ?? 3
  texturedPlane(g, bloodTexture(), w, d, 0, 0.028, 0, { rotX: -Math.PI / 2, transparent: true, opacity: 0.9, depthWrite: false })
  return g
}

function altar() {
  const g = new THREE.Group()
  box(g, 0x4a4640, 2.0, 1.0, 0.9, 0, 0.5, 0, { roughness: 0.9 })
  box(g, 0x6a645a, 2.2, 0.12, 1.0, 0, 1.05, 0, { roughness: 0.6 })
  box(g, 0x2a1a14, 1.4, 0.5, 0.02, 0, 0.62, 0.46)
  sphere(g, 0xe0d6c0, 0.17, 0, 1.3, 0)
  box(g, 0x341014, 0.2, 0.3, 0.02, 0, 1.68, -0.04)
  box(g, 0x341014, 0.2, 0.3, 0.02, 0, 1.68, 0.04)
  const c = candles()
  c.position.y = 1.11
  g.add(c)
  return g
}

function pewRow() {
  const g = new THREE.Group()
  box(g, 0x3e2818, 2.8, 0.1, 0.46, 0, 0.48, 0)
  box(g, 0x3e2818, 2.8, 0.7, 0.09, 0, 0.82, -0.2)
  for (const x of [-1.2, 1.2]) box(g, DARK, 0.1, 0.48, 0.45, x, 0.24, 0)
  for (const x of [-1.2, 1.2]) box(g, DARK, 0.1, 0.82, 0.1, x, 0.6, -0.2)
  return g
}

function crates() {
  const g = new THREE.Group()
  const c = 0x6a4a2a
  box(g, c, 1.0, 0.9, 1.0, 0, 0.45, 0, { roughness: 0.9 })
  box(g, 0x4a3018, 1.02, 0.08, 1.02, 0, 0.2, 0)
  box(g, 0x4a3018, 1.02, 0.08, 1.02, 0, 0.7, 0)
  box(g, c, 0.8, 0.7, 0.8, 0.5, 1.25, 0.2, { rotY: 0.4 })
  box(g, 0x5a3a20, 0.7, 0.6, 0.7, -0.6, 0.3, -0.5, { rotY: -0.3 })
  return g
}

function barrel() {
  const g = new THREE.Group()
  cylinder(g, 0x4a3a24, 0.36, 1.05, 0, 0.53, 0, { roughness: 0.85 })
  for (const y of [0.18, 0.53, 0.88]) torus(g, 0x2a2a26, 0.36, 0.025, 0, y, 0, { rotX: Math.PI / 2 })
  cylinder(g, 0x2a2118, 0.37, 0.06, 0, 1.05, 0)
  return g
}

function statue() {
  const g = new THREE.Group()
  box(g, 0x3a3630, 0.9, 0.7, 0.9, 0, 0.35, 0, { roughness: 0.8 })
  box(g, 0x55504a, 0.7, 0.15, 0.7, 0, 0.75, 0)
  cylinder(g, 0x77706a, 0.24, 1.3, 0, 1.45, 0, { roughness: 0.6 })
  sphere(g, 0x8a8078, 0.19, 0, 2.22, 0, { roughness: 0.6 })
  for (const s of [-1, 1]) {
    const arm = cylinder(g, 0x77706a, 0.08, 0.9, s * 0.36, 1.55, 0, { rotZ: s * 0.4, low: true })
    const wing = ico(g, 0x6a625a, 0.5, s * 0.5, 1.9, -0.2, { low: true, flatShading: true })
    wing.scale.set(0.5, 1, 0.15); wing.rotation.z = s * 0.7
  }
  // red eyes
  sphere(g, 0xff3020, 0.025, -0.07, 2.24, 0.16, { emissive: 0xff2010, emissiveIntensity: 2 })
  sphere(g, 0xff3020, 0.025, 0.07, 2.24, 0.16, { emissive: 0xff2010, emissiveIntensity: 2 })
  return g
}

function washer(o = {}) {
  const g = new THREE.Group()
  box(g, o.color ?? 0xc8ccc4, 0.95, 1.15, 0.95, 0, 0.58, 0, { metalness: 0.2, roughness: 0.45 })
  torus(g, 0x6a6e68, 0.27, 0.05, 0, 0.65, 0.49, { rotX: 0 })
  const glass = plane(g, 0x0a1a20, 0.45, 0.45, 0, 0.65, 0.5, { basic: true })
  box(g, 0x3a3e38, 0.6, 0.14, 0.04, 0, 1.0, 0.49)
  return g
}

function mudBench() {
  const g = new THREE.Group()
  box(g, WOOD, 2.6, 0.12, 0.6, 0, 0.48, 0)
  for (const x of [-1.1, 1.1]) box(g, DARK, 0.1, 0.48, 0.55, x, 0.24, 0)
  for (let i = 0; i < 3; i++) box(g, 0x5a3a22, 2.4, 0.06, 0.04, 0, 0.2, 0)
  // boots
  for (const x of [-0.6, 0.4]) { box(g, 0x2a2a26, 0.26, 0.3, 0.42, x, 0.78, 0.05); box(g, 0x2a2a26, 0.28, 0.12, 0.6, x, 0.62, 0.15) }
  return g
}

function treadmill() {
  const g = new THREE.Group()
  box(g, 0x2a2c2c, 0.9, 0.18, 2.2, 0, 0.22, 0, { roughness: 0.5 })
  box(g, 0x151616, 0.75, 0.06, 1.8, 0, 0.34, 0)
  for (const s of [-1, 1]) {
    cylinder(g, 0x5a605c, 0.035, 1.3, s * 0.42, 0.85, -0.95, { low: true })
    cylinder(g, 0x5a605c, 0.035, 0.9, s * 0.42, 1.42, -0.95, { rotX: 0.4, low: true })
  }
  box(g, 0x1a1c1c, 0.8, 0.28, 0.12, 0, 1.55, -1.05, { rotX: 0.3 })
  const screen = plane(g, 0x3affb0, 0.55, 0.18, 0, 1.56, -0.98, { basic: true, rotX: 0.3, transparent: true, opacity: 0.8 })
  return g
}

function benchPress() {
  const g = new THREE.Group()
  box(g, 0x242626, 0.7, 0.18, 1.9, 0, 0.48, 0, { roughness: 0.5 })
  for (const z of [-0.7, 0.7]) { box(g, 0x3a3e3c, 0.12, 0.5, 0.12, -0.34, 0.25, z); box(g, 0x3a3e3c, 0.12, 0.5, 0.12, 0.34, 0.25, z) }
  for (const s of [-1, 1]) cylinder(g, 0x6a706c, 0.035, 1.5, s * 0.8, 1.25, 0, { low: true })
  for (const s of [-1, 1]) sphere(g, 0x151515, 0.3, s * 1.55, 1.25, 0)
  return g
}

function theaterRow() {
  const g = new THREE.Group()
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.95
    box(g, 0x4a1418, 0.88, 0.28, 0.85, x, 0.42, 0, { roughness: 0.95 })
    box(g, 0x5a1a20, 0.88, 0.85, 0.2, x, 0.85, -0.34, { roughness: 0.95 })
    box(g, 0x5a1a20, 0.12, 0.5, 0.85, x - 0.5, 0.6, 0, { roughness: 0.95 })
    box(g, 0x5a1a20, 0.12, 0.5, 0.85, x + 0.5, 0.6, 0, { roughness: 0.95 })
    for (const s of [-1, 1]) cylinder(g, METAL, 0.05, 0.3, x + s * 0.38, 0.16, 0, { low: true })
  }
  return g
}

function screenProp(o = {}) {
  const g = new THREE.Group()
  box(g, 0x1a1a1c, o.w ?? 6, 3.3, 0.2, 0, 2.1, 0)
  const tex = tvStaticTexture()
  const s = texturedPlane(g, tex, (o.w ?? 6) * 0.93, 3.0, 0, 2.1, 0.11)
  s.material.color.setHex(0xa0b8ff)
  glow(g, 0x6a8aff, 4, 0, 2.1, 0.3, 0.18)
  g.userData.update = (t) => { s.material.opacity = 0.8 + Math.random() * 0.2 }
  return g
}

function projector() {
  const g = new THREE.Group()
  cylinder(g, METAL, 0.03, 0.5, 0, 3.1, 0, { low: true })
  box(g, 0x2a2c2e, 0.6, 0.22, 0.4, 0, 2.85, 0)
  cylinder(g, 0x101010, 0.1, 0.16, 0, 2.85, -0.26, { rotX: Math.PI / 2 })
  glow(g, 0x8ab0ff, 0.5, 0, 2.85, -0.36, 0.6)
  return g
}

function neonSign(o = {}) {
  const g = new THREE.Group()
  const w = o.w ?? 4
  const color = o.color ?? 0xff5a24
  const colorHex = o.colorHex ?? '#' + color.toString(16).padStart(6, '0')
  const tex = neonTexture(o.text ?? 'OPEN', colorHex)
  texturedPlane(g, tex, w, w * 0.3125, 0, 0, 0.02, { transparent: true })
  glow(g, color, w * 0.9, 0, 0, 0.2, 0.25)
  light(g, color, 2.2, 5, 0, 0, 0.5)
  box(g, 0x101210, w + 0.1, w * 0.33 + 0.1, 0.08, 0, 0, -0.04)
  return g
}

function serverRack() {
  const g = new THREE.Group()
  box(g, 0x1a1d1e, 0.8, 2.4, 0.7, 0, 1.2, 0, { metalness: 0.4, roughness: 0.4 })
  for (let i = 0; i < 8; i++) {
    box(g, 0x252a2a, 0.66, 0.18, 0.04, 0, 0.35 + i * 0.24, 0.36)
    const led = sphere(g, i % 3 === 0 ? 0xff3020 : 0x3aff80, 0.022, -0.2 + (i % 2) * 0.06, 0.35 + i * 0.24, 0.39, { emissive: i % 3 === 0 ? 0xff3020 : 0x3aff80, emissiveIntensity: 2 })
    led.userData.phase = i * 0.7
  }
  const leds = g.children.filter(c => c.userData.phase !== undefined)
  g.userData.update = (t) => { for (const l of leds) l.material.emissiveIntensity = 0.6 + Math.abs(Math.sin(t * 3 + l.userData.phase)) * 2.2 }
  return g
}

function throne() {
  const g = new THREE.Group()
  box(g, 0x1a1518, 1.9, 0.5, 1.5, 0, 0.25, 0, { roughness: 0.5 })
  box(g, 0x2a2024, 1.6, 0.4, 1.1, 0, 0.65, 0, { roughness: 0.7 })
  box(g, 0x2a2024, 1.8, 2.6, 0.3, 0, 1.6, -0.55, { roughness: 0.6 })
  box(g, 0x4a0a12, 1.2, 1.6, 0.06, 0, 1.6, -0.38)
  for (const s of [-1, 1]) {
    box(g, 0x2a2024, 0.22, 1.5, 0.6, s * 0.8, 0.9, 0)
    cone(g, 0x3a2a2a, 0.12, 0.55, s * 0.8, 3.0, -0.55)
    cone(g, 0x3a2a2a, 0.09, 0.4, s * 0.55, 3.1, -0.55)
  }
  glow(g, 0xff2a4a, 2.4, 0, 1.7, -0.3, 0.18)
  return g
}

function lavaPit(o = {}) {
  const g = new THREE.Group()
  const w = o.w ?? 4, d = o.d ?? 4
  box(g, 0x1a1210, w + 0.5, 0.24, d + 0.5, 0, 0.05, 0, { roughness: 0.9 })
  const mat = fireShader(0x7a0c08, 0xffb02a)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat)
  m.rotation.x = -Math.PI / 2; m.position.y = 0.19
  g.add(m)
  glow(g, 0xff4a10, w * 1.2, 0, 0.5, 0, 0.28)
  light(g, 0xff4a10, 8, 9, 0, 1.1, 0)
  const rocks = []
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2
    const r = Math.max(w, d) * 0.55
    ico(g, 0x241a16, 0.25 + (i % 3) * 0.1, Math.cos(a) * r, 0.15, Math.sin(a) * r, { low: true, flatShading: true })
  }
  g.userData.update = (t) => { mat.uniforms.uTime.value = t }
  return g
}

function slimePit(o = {}) {
  const g = new THREE.Group()
  const w = o.w ?? 4, d = o.d ?? 4
  box(g, 0x1d2a20, w + 0.5, 0.22, d + 0.5, 0, 0.04, 0, { roughness: 0.7 })
  const mat = fireShader(0x0d3a1a, 0x7aff4a)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat)
  m.rotation.x = -Math.PI / 2; m.position.y = 0.17
  g.add(m)
  glow(g, 0x5aff3a, w * 1.15, 0, 0.5, 0, 0.24)
  light(g, 0x5aff6a, 5, 8, 0, 1.0, 0)
  g.userData.update = (t) => { mat.uniforms.uTime.value = t }
  return g
}

function mirror(o = {}) {
  const g = new THREE.Group()
  const w = o.w ?? 3
  box(g, 0x2a2218, w + 0.2, 2.4, 0.1, 0, 1.5, 0, { roughness: 0.4 })
  texturedPlane(g, starfieldTexture(), w, 2.2, 0, 1.5, 0.06, { opacity: 0.9 })
  // cracks
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2
    const crack = box(g, 0xc8d8e0, 0.02, 1.0, 0.01, Math.cos(a) * 0.3, 1.5 + Math.sin(a) * 0.3, 0.07, { transparent: true, opacity: 0.5 })
    crack.rotation.z = a
  }
  return g
}

function grandfatherClock() {
  const g = new THREE.Group()
  box(g, 0x3a2414, 0.8, 2.7, 0.55, 0, 1.35, 0, { roughness: 0.6 })
  box(g, 0x1e140a, 0.62, 0.9, 0.04, 0, 2.1, 0.29)
  const face = plane(g, 0xe8dfc0, 0.5, 0.5, 0, 2.12, 0.315, { basic: true })
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2
    box(g, 0x1a1410, 0.02, 0.08, 0.01, -Math.sin(a) * 0.21, 2.12 + Math.cos(a) * 0.21, 0.32)
  }
  const pendulum = new THREE.Group(); pendulum.position.set(0, 1.65, 0.3); g.add(pendulum)
  cylinder(g, BRASS, 0.015, 0.8, 0, 1.35, 0.3, { low: true })
  sphere(pendulum, BRASS, 0.12, 0, -0.4, 0)
  g.userData.update = (t) => { pendulum.rotation.z = Math.sin(t * 1.7) * 0.22 }
  return g
}

function piano() {
  const g = new THREE.Group()
  box(g, 0x141210, 2.2, 0.7, 0.9, 0, 0.55, 0, { roughness: 0.3 })
  box(g, 0x141210, 1.4, 0.16, 2.0, 0.3, 0.85, 0.1, { rotY: 0.2 })
  box(g, 0xe8e0c8, 1.5, 0.06, 0.3, 0, 0.93, 0.55)
  for (let i = 0; i < 18; i++) box(g, 0x0c0b0a, 0.07, 0.03, 0.18, -0.7 + i * 0.083, 0.97, 0.55)
  for (const s of [-1, 1]) box(g, 0x0c0b0a, 0.09, 0.55, 0.09, s * 0.9, 0.27, 0.35)
  for (const s of [-1, 1]) cylinder(g, BRASS, 0.025, 0.18, s * 0.4, 0.23, -0.25, { low: true })
  return g
}

export function makeProp(type, opts = {}) {
  let g
  switch (type) {
    case 'sofa': g = sofa(opts); break
    case 'armchair': g = armchair(opts); break
    case 'coffeeTable': g = coffeeTable(opts); break
    case 'rug': g = rug(opts); break
    case 'tv': g = tv(opts); break
    case 'bookshelf': g = bookshelf(opts); break
    case 'fireplace': g = fireplace(opts); break
    case 'plant': g = plant(opts); break
    case 'pottedPalm': g = pottedPalm(opts); break
    case 'console': g = consoleTable(opts); break
    case 'kitchenCounter': g = kitchenCounter(opts); break
    case 'islandCounter': g = islandCounter(opts); break
    case 'fridge': g = fridge(opts); break
    case 'stove': g = stove(opts); break
    case 'diningTable': g = diningTable(opts); break
    case 'chair': g = chair(opts); break
    case 'sideboard': g = sideboard(opts); break
    case 'poolTable': g = poolTable(opts); break
    case 'bar': g = bar(opts); break
    case 'bed': g = bed(opts); break
    case 'wardrobe': g = wardrobe(opts); break
    case 'dresser': g = dresser(opts); break
    case 'chandelier': g = chandelier(opts); break
    case 'ceilingFan': g = ceilingFan(opts); break
    case 'candles': g = candles(opts); break
    case 'bones': g = bones(opts); break
    case 'bloodRug': g = bloodRug(opts); break
    case 'altar': g = altar(opts); break
    case 'pewRow': g = pewRow(opts); break
    case 'crates': g = crates(opts); break
    case 'barrel': g = barrel(opts); break
    case 'statue': g = statue(opts); break
    case 'washer': g = washer(opts); break
    case 'mudBench': g = mudBench(opts); break
    case 'treadmill': g = treadmill(opts); break
    case 'benchPress': g = benchPress(opts); break
    case 'theaterRow': g = theaterRow(opts); break
    case 'screen': g = screenProp(opts); break
    case 'projector': g = projector(opts); break
    case 'neonSign': g = neonSign(opts); break
    case 'serverRack': g = serverRack(opts); break
    case 'throne': g = throne(opts); break
    case 'lavaPit': g = lavaPit(opts); break
    case 'slimePit': g = slimePit(opts); break
    case 'mirror': g = mirror(opts); break
    case 'grandfatherClock': g = grandfatherClock(opts); break
    case 'piano': g = piano(opts); break
    default: g = new THREE.Group()
  }
  g.userData.type = type
  return g
}

export function makePlumbob(color = 0x67d94f, size = 0.34) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), material(color, {
    emissive: color, emissiveIntensity: 1.4, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.92,
  }))
  body.scale.y = 1.55
  g.add(body)
  glow(g, color, size * 6, 0, 0, 0, 0.55)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 1.25, 0.012, 6, 28), material(color, { emissive: color, emissiveIntensity: 1.5, transparent: true, opacity: 0.6 }))
  ring.rotation.x = Math.PI / 2
  ring.position.y = -size * 0.4
  g.add(ring)
  g.userData.spin = body
  g.userData.ring = ring
  return g
}

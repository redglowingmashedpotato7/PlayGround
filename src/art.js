import * as THREE from 'three'
import { glowTexture } from './textures.js'

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 18, 14),
  sphereLo: new THREE.SphereGeometry(1, 10, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cylLo: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 18),
  ico: new THREE.IcosahedronGeometry(1, 1),
  icoLo: new THREE.IcosahedronGeometry(1, 0),
  octa: new THREE.OctahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.08, 8, 40),
  plane: new THREE.PlaneGeometry(1, 1),
  circle: new THREE.CircleGeometry(1, 32),
}

const matCache = new Map()

export function material(color = 0xffffff, opts = {}) {
  const key = [
    color, opts.roughness, opts.metalness, opts.emissive, opts.emissiveIntensity,
    opts.transparent, opts.opacity, opts.side, opts.depthWrite, opts.flatShading, opts.map ? opts.map.uuid : '', opts.alphaTest,
  ].join('|')
  if (matCache.has(key)) return matCache.get(key)
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.78,
    metalness: opts.metalness ?? 0.02,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
    flatShading: opts.flatShading ?? false,
    map: opts.map ?? null,
    alphaTest: opts.alphaTest ?? 0,
  })
  if (opts.map) m.map = opts.map
  if (opts.emissiveMap) m.emissiveMap = opts.emissiveMap
  matCache.set(key, m)
  return m
}

export function basicMaterial(color = 0xffffff, opts = {}) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
    blending: opts.blending ?? THREE.NormalBlending,
    toneMapped: opts.toneMapped ?? false,
    map: opts.map ?? null,
    alphaTest: opts.alphaTest ?? 0,
  })
}

export function box(parent, color, w, h, d, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(G.box, opts.mat || material(color, opts))
  m.scale.set(w, h, d); m.position.set(x, y, z)
  if (opts.rotX) m.rotation.x = opts.rotX
  if (opts.rotY) m.rotation.y = opts.rotY
  if (opts.rotZ) m.rotation.z = opts.rotZ
  m.castShadow = opts.castShadow ?? false
  m.receiveShadow = opts.receiveShadow ?? false
  parent.add(m)
  return m
}

export function sphere(parent, color, r, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(opts.low ? G.sphereLo : G.sphere, opts.mat || material(color, opts))
  m.scale.setScalar(r); m.position.set(x, y, z)
  m.castShadow = opts.castShadow ?? false
  m.receiveShadow = opts.receiveShadow ?? false
  parent.add(m)
  return m
}

export function cylinder(parent, color, r, h, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(opts.low ? G.cylLo : G.cyl, opts.mat || material(color, opts))
  m.scale.set(r, h, r); m.position.set(x, y, z)
  if (opts.rotX) m.rotation.x = opts.rotX
  if (opts.rotY) m.rotation.y = opts.rotY
  if (opts.rotZ) m.rotation.z = opts.rotZ
  m.castShadow = opts.castShadow ?? false
  m.receiveShadow = opts.receiveShadow ?? false
  parent.add(m)
  return m
}

export function cone(parent, color, r, h, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(G.cone, opts.mat || material(color, opts))
  m.scale.set(r, h, r); m.position.set(x, y, z)
  if (opts.rotX) m.rotation.x = opts.rotX
  if (opts.rotY) m.rotation.y = opts.rotY
  if (opts.rotZ) m.rotation.z = opts.rotZ
  m.castShadow = opts.castShadow ?? false
  parent.add(m)
  return m
}

export function ico(parent, color, r, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(opts.low ? G.icoLo : G.ico, opts.mat || material(color, opts))
  m.scale.setScalar(r); m.position.set(x, y, z)
  if (opts.rotY) m.rotation.y = opts.rotY
  if (opts.rotX) m.rotation.x = opts.rotX
  if (opts.rotZ) m.rotation.z = opts.rotZ
  m.castShadow = opts.castShadow ?? false
  m.receiveShadow = opts.receiveShadow ?? false
  parent.add(m)
  return m
}

export function octa(parent, color, r, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(G.octa, opts.mat || material(color, opts))
  m.scale.set(r, r * 1.55, r); m.position.set(x, y, z)
  if (opts.rotX) m.rotation.x = opts.rotX
  if (opts.rotY) m.rotation.y = opts.rotY
  parent.add(m)
  return m
}

export function torus(parent, color, radius, tube, x = 0, y = 0, z = 0, opts = {}) {
  const geo = tube ? new THREE.TorusGeometry(radius, tube, 8, 40) : G.torus
  const m = new THREE.Mesh(geo, opts.mat || material(color, opts))
  if (!tube) m.scale.setScalar(radius)
  m.position.set(x, y, z)
  if (opts.rotX) m.rotation.x = opts.rotX
  if (opts.rotY) m.rotation.y = opts.rotY
  if (opts.rotZ) m.rotation.z = opts.rotZ
  parent.add(m)
  return m
}

export function plane(parent, color, w, h, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(G.plane, opts.basic ? basicMaterial(color, opts) : (opts.mat || material(color, opts)))
  m.scale.set(w, h, 1); m.position.set(x, y, z)
  if (opts.rotX !== undefined) m.rotation.x = opts.rotX
  if (opts.rotY) m.rotation.y = opts.rotY
  if (opts.rotZ) m.rotation.z = opts.rotZ
  m.receiveShadow = opts.receiveShadow ?? false
  m.renderOrder = opts.renderOrder ?? 0
  parent.add(m)
  return m
}

export function texturedBox(parent, texture, w, h, d, x = 0, y = 0, z = 0, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    color: opts.color ?? 0xffffff,
    roughness: opts.roughness ?? 0.86,
    metalness: opts.metalness ?? 0.02,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  })
  const m = new THREE.Mesh(G.box, mat)
  m.scale.set(w, h, d); m.position.set(x, y, z)
  m.castShadow = opts.castShadow ?? false
  m.receiveShadow = opts.receiveShadow ?? true
  parent.add(m)
  return m
}

export function glow(parent, color, size, x = 0, y = 0, z = 0, opacity = 0.8) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  })
  const s = new THREE.Sprite(mat)
  s.scale.setScalar(size); s.position.set(x, y, z)
  parent.add(s)
  return s
}

export function shadowBlob(parent, size = 1, opacity = 0.28, x = 0, y = 0.015, z = 0) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity, depthWrite: false, toneMapped: false })
  const m = new THREE.Mesh(G.circle, mat)
  m.scale.set(size, size, 1); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z)
  m.renderOrder = 1
  parent.add(m)
  return m
}

export function light(parent, color, intensity, distance, x = 0, y = 0, z = 0, opts = {}) {
  const l = new THREE.PointLight(color, intensity, distance, opts.decay ?? 2)
  l.position.set(x, y, z)
  if (opts.castShadow) {
    l.castShadow = true
    l.shadow.mapSize.set(512, 512)
    l.shadow.bias = -0.002
  }
  parent.add(l)
  return l
}

export function disposeObject(obj) {
  const cachedMats = new Set(matCache.values())
  obj.traverse((o) => {
    if (o.isMesh || o.isPoints || o.isSprite) {
      if (o.geometry && !Object.values(G).includes(o.geometry)) o.geometry.dispose?.()
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) {
        if (!m) continue
        // Shared cached materials and textures are intentionally kept.
        if (!cachedMats.has(m)) m.dispose?.()
      }
    }
  })
}

export function createGroup(parent, x = 0, y = 0, z = 0, rotY = 0) {
  const g = new THREE.Group()
  g.position.set(x, y, z); g.rotation.y = rotY
  parent.add(g)
  return g
}

export { G }

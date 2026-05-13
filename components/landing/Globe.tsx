'use client'
import { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// ── Fallback dark sphere — shown while textures load over slow connections ──
function FallbackSphere() {
  const groupRef = useRef<THREE.Group>(null)
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.0024
  })
  return (
    <group ref={groupRef} position={[0, -0.92, 0]}>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#06101c" roughness={0.8} metalness={0} />
      </mesh>
      {/* Keep atmosphere on fallback so the shape reads as a planet */}
      <mesh scale={1.38}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#1a3870" transparent opacity={0.10} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

// ── Real textured Earth ──────────────────────────────────────────────────────
function EarthScene() {
  const earthRef  = useRef<THREE.Group>(null)
  const cloudsRef = useRef<THREE.Group>(null)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mq.matches
    const handler = (e: MediaQueryListEvent) => { reducedMotionRef.current = e.matches }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const [dayMap, nightMap, cloudsMap] = useTexture([
    '/textures/earth-day.jpg',
    '/textures/earth-night.png',
    '/textures/earth-clouds.jpg',
  ])

  useFrame(() => {
    if (reducedMotionRef.current) return
    if (earthRef.current)  earthRef.current.rotation.y  += 0.0024
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0016 // 33% slower
  })

  return (
    <>
      {/* Raised ambient — dark hemisphere reads as deep space, not solid black */}
      <ambientLight intensity={0.14} />
      {/* Sunrise key: strong warm light from upper-left, creates dawn terminator */}
      <directionalLight position={[-5, 2, 2]}      intensity={3.6}  color="#ffd0a0" />
      {/* Deep-space fill: cool blue from far side, adds dimension */}
      <directionalLight position={[3, -1, -2]}     intensity={0.22} color="#8ab0d8" />
      {/* Warm rim backlight: behind the globe, amber silhouette glow */}
      <directionalLight position={[0.5, -0.2, -4]} intensity={1.15} color="#ff8020" />
      {/* Night-side cool fill: makes shadow hemisphere read as space */}
      <directionalLight position={[4, 0, 1]}       intensity={0.16} color="#203860" />

      {/* ── Earth: surface + city lights + atmosphere ── */}
      <group ref={earthRef} position={[0, -0.92, 0]}>

        {/* Earth surface — day texture darkened with color multiplier for cinematic look */}
        {/* color="#707070" acts as a 44% brightness multiplier on the texture */}
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial
            map={dayMap}
            color="#707070"
            roughness={0.80}
            metalness={0.0}
          />
        </mesh>

        {/* City lights — AdditiveBlending: black = fully transparent, warm glow = additive */}
        {/* On the lit day side the additive contribution is invisible against the bright surface */}
        {/* On the dark night side the city glow is clearly visible */}
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial
            map={nightMap}
            blending={THREE.AdditiveBlending}
            transparent
            opacity={0.55}
          />
        </mesh>

        {/* Atmospheric limb — blue edge glow as seen from space */}
        <mesh scale={1.38}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#1a3870"
            transparent
            opacity={0.10}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Outer corona — wide depth envelope */}
        <mesh scale={1.62}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#2050a0"
            transparent
            opacity={0.028}
            side={THREE.BackSide}
          />
        </mesh>
      </group>

      {/* ── Cloud layer — independent group, rotates 33% slower than Earth ── */}
      {/* Separate group keeps cloud rotation truly independent of Earth rotation */}
      <group ref={cloudsRef} position={[0, -0.92, 0]}>
        <mesh scale={1.012}>
          <sphereGeometry args={[1, 64, 64]} />
          {/* alphaMap uses cloud texture's luminance: white clouds = opaque, black sky = clear */}
          <meshStandardMaterial
            alphaMap={cloudsMap}
            transparent
            opacity={0.22}
            color="#c8d8e8"
            roughness={1}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  )
}

// ── Canvas wrapper ───────────────────────────────────────────────────────────
export function GlobeHero() {
  return (
    <div className="hero-globe-wrap" aria-hidden="true">
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 3.6], fov: 42 }}
        dpr={[1, 1.5]}
        frameloop="always"
      >
        <Suspense fallback={<FallbackSphere />}>
          <EarthScene />
        </Suspense>
      </Canvas>
      {/* Gradient fade: seals the bottom of the canvas into the hero background */}
      <div className="hero-globe-fade" aria-hidden="true" />
    </div>
  )
}

'use client'
import { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Constant outside component — avoids creating a new Vector2 every render
const NORMAL_SCALE = new THREE.Vector2(2.0, 2.0)

// ── Dark sphere shown while the three textures stream in ──────────────────────
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
      <mesh scale={1.38}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#1a3870" transparent opacity={0.09} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

// ── Real textured Earth ───────────────────────────────────────────────────────
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

  const [dayMap, nightMap, cloudsMap, normalMap] = useTexture([
    '/textures/earth-day.jpg',
    '/textures/earth-night.png',
    '/textures/earth-clouds.jpg',
    '/textures/earth-normal.jpg',
  ])

  useFrame(() => {
    if (reducedMotionRef.current) return
    if (earthRef.current)  earthRef.current.rotation.y  += 0.0024
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0016 // clouds drift slower
  })

  return (
    <>
      {/* Low ambient: dark side reads as deep space, not flat black */}
      <ambientLight intensity={0.12} />

      {/* Key light: near-white from upper-left — creates dawn terminator without orange tint */}
      {/* Near-white lets the texture's real blues, greens, and browns show through */}
      <directionalLight position={[-5, 2, 2]}      intensity={3.4}  color="#fff4ec" />

      {/* Space fill: cool blue from far side — separates the night hemisphere */}
      <directionalLight position={[3, -1, -2]}     intensity={0.18} color="#7090c0" />

      {/* Terminator rim: very subtle warm edge at the day/night boundary */}
      {/* Low intensity — hints at atmosphere, not a dominant orange halo */}
      <directionalLight position={[0.5, -0.2, -4]} intensity={0.35} color="#ee7828" />

      {/* Night-side fill: keeps dark hemisphere space-like and dimensional */}
      <directionalLight position={[4, 0, 1]}       intensity={0.14} color="#1a3060" />

      {/* ── Earth: surface + city lights + atmosphere ── */}
      <group ref={earthRef} position={[0, -0.92, 0]}>

        {/* Surface — color="#a0a0a0" = 63% brightness multiplier, preserves natural Earth hues */}
        {/* Normal map adds visible mountain relief at the terminator edge */}
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial
            map={dayMap}
            normalMap={normalMap}
            normalScale={NORMAL_SCALE}
            color="#a0a0a0"
            roughness={0.75}
            metalness={0.0}
          />
        </mesh>

        {/* City lights — AdditiveBlending: black=transparent, warm glow=additive */}
        {/* Day side: additive contribution invisible against lit surface */}
        {/* Night side: gold city clusters clearly visible */}
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial
            map={nightMap}
            blending={THREE.AdditiveBlending}
            transparent
            opacity={0.60}
          />
        </mesh>

        {/* Atmospheric limb — blue edge glow from space */}
        <mesh scale={1.38}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#1a3870"
            transparent
            opacity={0.09}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Outer corona — wide depth envelope */}
        <mesh scale={1.62}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#2050a0"
            transparent
            opacity={0.025}
            side={THREE.BackSide}
          />
        </mesh>
      </group>

      {/* ── Cloud layer — independent group, rotates 33% slower than Earth ── */}
      <group ref={cloudsRef} position={[0, -0.92, 0]}>
        <mesh scale={1.012}>
          <sphereGeometry args={[1, 64, 64]} />
          {/* alphaMap reads cloud texture luminance: white=opaque cloud, black=clear sky */}
          <meshStandardMaterial
            alphaMap={cloudsMap}
            transparent
            opacity={0.20}
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

// ── Canvas wrapper ────────────────────────────────────────────────────────────
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
      {/* Gradient seal at the bottom — merges globe into the section below */}
      <div className="hero-globe-fade" aria-hidden="true" />
    </div>
  )
}

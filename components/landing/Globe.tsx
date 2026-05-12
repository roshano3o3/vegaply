'use client'
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function latLngToXYZ(lat: number, lng: number, r = 1): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  )
}

// Tech-hub cities where Vegaply users apply from and to
const MARKERS = [
  { lat: 37.77, lng: -122.41 },  // San Francisco
  { lat: 40.71, lng: -74.00 },   // New York
  { lat: 51.50, lng: -0.12 },    // London
  { lat: 1.35,  lng: 103.82 },   // Singapore
  { lat: 29.76, lng: -95.37 },   // Houston
  { lat: 47.61, lng: -122.33 },  // Seattle
  { lat: 37.38, lng: -122.08 },  // Mountain View
  { lat: 30.27, lng: -97.74 },   // Austin
  { lat: 41.88, lng: -87.63 },   // Chicago
  { lat: 32.78, lng: -96.80 },   // Dallas
]

function GlobeScene() {
  const groupRef = useRef<THREE.Group>(null)

  const dotGeometry = useMemo(() => {
    const pts = MARKERS.map(m => latLngToXYZ(m.lat, m.lng, 1.012))
    const arr = new Float32Array(pts.length * 3)
    pts.forEach((p, i) => {
      arr[i * 3]     = p.x
      arr[i * 3 + 1] = p.y
      arr[i * 3 + 2] = p.z
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return geo
  }, [])

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.0014
  })

  return (
    <>
      <ambientLight intensity={0.38} />
      <directionalLight position={[-3, 2, 1]}    intensity={0.80} color="#ffd4a8" />
      <directionalLight position={[2.5, -0.5, -1.5]} intensity={0.22} color="#ffe8d0" />

      {/* All globe elements rotate together */}
      <group ref={groupRef} position={[0, -1.20, 0]}>

        {/* Globe surface — deep navy with self-glow so it reads as a world-model, not a void */}
        <mesh>
          <sphereGeometry args={[1, 72, 72]} />
          <meshPhongMaterial
            color="#f2c4a0"
            emissive="#1a0800"
            specular="#ffe4cc"
            shininess={12}
          />
        </mesh>

        {/* Lat/lng wireframe grid */}
        <mesh>
          <sphereGeometry args={[1.003, 36, 18]} />
          <meshBasicMaterial
            color="#b45309"
            wireframe
            transparent
            opacity={0.30}
          />
        </mesh>

        {/* City marker dots */}
        <points geometry={dotGeometry}>
          <pointsMaterial
            size={0.018}
            color="#fbbf24"
            transparent
            opacity={0.72}
            sizeAttenuation
          />
        </points>

        {/* Inner atmospheric warmth */}
        <mesh scale={1.09}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#f4d4a8" transparent opacity={0.022} />
        </mesh>

        {/* Outer rim — primary halo */}
        <mesh scale={1.38}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#e8a87c"
            transparent
            opacity={0.042}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Outer corona — wide, near-invisible envelope for depth */}
        <mesh scale={1.62}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#f4c28c"
            transparent
            opacity={0.018}
            side={THREE.BackSide}
          />
        </mesh>
      </group>
    </>
  )
}

export function GlobeHero() {
  return (
    <div className="hero-globe-wrap" aria-hidden="true">
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 3.2], fov: 42 }}
        dpr={[1, 2]}
        frameloop="always"
      >
        <GlobeScene />
      </Canvas>
      {/* Gradient fade: top keeps text readable, bottom blends into next section */}
      <div className="hero-globe-fade" aria-hidden="true" />
    </div>
  )
}

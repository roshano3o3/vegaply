'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play } from 'lucide-react'

interface DemoVideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoSrc: string
}

export function DemoVideoModal({ isOpen, onClose, videoSrc }: DemoVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showPlayOverlay, setShowPlayOverlay] = useState(false)

  const handleClose = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setShowPlayOverlay(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, handleClose])

  // Auto-play on open; show overlay only if browser blocks it
  useEffect(() => {
    if (!isOpen || !videoRef.current) return
    videoRef.current.play().then(() => {
      setShowPlayOverlay(false)
    }).catch(() => {
      setShowPlayOverlay(true)
    })
  }, [isOpen])

  const handleOverlayPlay = () => {
    videoRef.current?.play().then(() => setShowPlayOverlay(false)).catch(() => {})
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="demo-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          aria-modal="true"
          role="dialog"
          aria-label="Demo video"
        >
          <motion.div
            key="demo-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[90vw] max-h-[90vh] rounded-2xl overflow-hidden bg-[#0a0a0a] shadow-2xl"
            style={{ aspectRatio: '16/9' }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="Close demo video"
              className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/70 hover:bg-[#f59e0b] hover:text-black transition-all duration-150"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <video
              ref={videoRef}
              src={videoSrc}
              poster="/vegaply_poster.jpg"
              controls
              playsInline
              onPlay={() => setShowPlayOverlay(false)}
              className="w-full h-full object-contain"
            />

            {/* Mobile play overlay — shown when autoplay is blocked */}
            <AnimatePresence>
              {showPlayOverlay && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleOverlayPlay}
                  aria-label="Play video"
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex items-center justify-center w-20 h-20 rounded-full bg-[#f59e0b] text-black shadow-lg"
                  >
                    <Play size={36} fill="currentColor" />
                  </motion.span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

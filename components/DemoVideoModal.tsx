'use client'
import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DemoVideoModalProps {
  isOpen: boolean
  onClose: () => void
  /** Full iframe embed URL, e.g.
   *  YouTube:           https://www.youtube.com/embed/VIDEO_ID?autoplay=1&rel=0
   *  Cloudflare Stream: https://iframe.videodelivery.net/VIDEO_ID?autoplay=true
   */
  embedUrl: string
}

export function DemoVideoModal({ isOpen, onClose, embedUrl }: DemoVideoModalProps) {
  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, handleClose])

  // Append autoplay to the embed URL when the modal is open, strip it on close
  // so the video stops when the user dismisses the modal.
  const src = isOpen ? embedUrl : ''

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

            <iframe
              src={src}
              title="Vegaply demo video"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

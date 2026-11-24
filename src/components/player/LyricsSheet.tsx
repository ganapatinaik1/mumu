import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Mic2 } from 'lucide-react';

interface LyricsSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  artistName: string;
  accentRgb: string; // "r, g, b"
}

export const LyricsSheet: React.FC<LyricsSheetProps> = ({ open, onClose, title, artistName, accentRgb }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[121] flex flex-col"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: `linear-gradient(180deg, rgba(${accentRgb}, 0.35) 0%, rgba(10,10,12,0.97) 40%, #0a0a0c 100%)`,
          }}
        >
          <div className="absolute inset-0 backdrop-blur-2xl bg-black/30" />

          <div className="relative flex flex-col h-full pt-safe">
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <button onClick={onClose} className="p-2 -ml-2 active:scale-90 transition-transform">
                <ChevronDown className="h-6 w-6 text-white" />
              </button>
              <div className="text-center">
                <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">Lyrics</p>
              </div>
              <div className="w-10" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-10 text-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `rgba(${accentRgb}, 0.18)` }}
              >
                <Mic2 className="h-7 w-7 text-white/70" />
              </div>
              <div>
                <p className="text-white font-semibold text-base mb-1">Lyrics Not Available</p>
                <p className="text-white/50 text-sm leading-relaxed">
                  We don't have lyrics for "{title}" by {artistName} yet.
                </p>
              </div>
            </div>

            <div className="h-24 flex-shrink-0" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

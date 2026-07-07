'use client';

import * as React from 'react';
import { Moon, Sun, Droplets } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ 
        scale: 0.85, 
        borderRadius: "50% 50% 10% 50%", // Water drop squish shape
      }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="relative flex items-center justify-center h-10 w-10 rounded-full border border-primary/20 bg-background/50 backdrop-blur-md shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-2px_4px_rgba(255,255,255,0.1)] hover:bg-primary/10 overflow-hidden"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title="Toggle theme"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
      <motion.div
        initial={false}
        animate={{ 
          rotate: theme === 'dark' ? 360 : 0,
          scale: theme === 'dark' ? 0 : 1 
        }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="absolute"
      >
        <Sun className="h-[1.2rem] w-[1.2rem] text-amber-500 drop-shadow-sm" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ 
          rotate: theme === 'dark' ? 0 : -360,
          scale: theme === 'dark' ? 1 : 0 
        }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="absolute"
      >
        <Moon className="h-[1.2rem] w-[1.2rem] text-sky-400 drop-shadow-sm" />
      </motion.div>
      <span className="sr-only">Toggle theme</span>
    </motion.button>
  );
}

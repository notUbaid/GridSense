'use client';

import * as React from 'react';
import { Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

interface OllamaToggleProps {
  useOllama: boolean;
  setUseOllama: (val: boolean) => void;
}

export function OllamaToggle({ useOllama, setUseOllama }: OllamaToggleProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`relative flex items-center justify-center h-10 w-10 rounded-full border border-primary/20 bg-background/50 backdrop-blur-md shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-2px_4px_rgba(255,255,255,0.1)] overflow-hidden transition-colors ${useOllama ? 'bg-primary/10 dark:bg-primary/20 border-primary/50' : 'hover:bg-primary/10'}`}
      onClick={() => setUseOllama(!useOllama)}
      title={useOllama ? "Local AI: Enabled" : "Local AI: Disabled"}
    >
      <div className="absolute inset-0 bg-linear-to-tr from-primary/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
      <motion.div
        animate={{ 
          scale: useOllama ? 1.1 : 1,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <Cpu className={`h-[1.2rem] w-[1.2rem] drop-shadow-sm transition-colors ${useOllama ? 'text-primary' : 'text-muted-foreground'}`} />
      </motion.div>
    </motion.button>
  );
}

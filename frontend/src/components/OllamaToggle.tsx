'use client';

import * as React from 'react';
import { Cpu, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OllamaToggleProps {
  useOllama: boolean;
  setUseOllama: (val: boolean) => void;
}

export function OllamaToggle({ useOllama, setUseOllama }: OllamaToggleProps) {
  const [connectionState, setConnectionState] = React.useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isOpen, setIsOpen] = React.useState(false);
  const popupRef = React.useRef<HTMLDivElement>(null);

  // Sync state if it was toggled off externally (e.g., from an error in useProcessing)
  React.useEffect(() => {
    if (!useOllama && connectionState === 'connected') {
      setConnectionState('idle');
    }
  }, [useOllama, connectionState]);

  // Click outside to close popup
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = async () => {
    if (useOllama) {
      // Turn off
      setUseOllama(false);
      setConnectionState('idle');
      setIsOpen(false);
      return;
    }

    // Attempt to connect
    setConnectionState('connecting');
    setIsOpen(true);

    try {
      // 1.5s timeout for local fetch so it doesn't hang forever
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch('http://127.0.0.1:11434/api/tags', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setConnectionState('connected');
        setUseOllama(true);
        // Auto-close success popup after a short delay
        setTimeout(() => setIsOpen(false), 2000);
      } else {
        throw new Error('Non-200 response');
      }
    } catch (err) {
      console.error('Ollama connection failed:', err);
      setConnectionState('error');
      setUseOllama(false);
    }
  };

  return (
    <div className="relative" ref={popupRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={`relative flex items-center justify-center h-10 w-10 rounded-full border bg-background/50 backdrop-blur-md shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-2px_4px_rgba(255,255,255,0.1)] overflow-hidden transition-colors ${
          useOllama 
            ? 'bg-primary/10 dark:bg-primary/20 border-primary/50' 
            : connectionState === 'connecting'
            ? 'border-amber-500/50 bg-amber-500/10'
            : connectionState === 'error'
            ? 'border-destructive/50 bg-destructive/10'
            : 'border-primary/20 hover:bg-primary/10'
        }`}
        onClick={handleToggle}
        title={useOllama ? "Local AI: Connected" : "Local AI: Disconnected"}
      >
        <div className="absolute inset-0 bg-linear-to-tr from-primary/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
        
        <AnimatePresence mode="wait">
          {connectionState === 'connecting' ? (
            <motion.div
              key="connecting"
              initial={{ scale: 0, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <Loader2 className="h-[1.2rem] w-[1.2rem] text-amber-500 animate-spin" />
            </motion.div>
          ) : connectionState === 'error' ? (
            <motion.div
              key="error"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Cpu className="h-[1.2rem] w-[1.2rem] text-destructive drop-shadow-sm" />
            </motion.div>
          ) : (
            <motion.div
              key="idle-or-connected"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: useOllama ? 1.1 : 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <Cpu className={`h-[1.2rem] w-[1.2rem] drop-shadow-sm transition-colors ${useOllama ? 'text-primary' : 'text-muted-foreground'}`} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Popup Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute top-full mt-2 right-0 w-64 p-3 rounded-lg border bg-popover text-popover-foreground shadow-lg z-50 overflow-hidden"
          >
            {connectionState === 'connecting' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting to Ollama...
                </div>
                <p className="text-xs text-muted-foreground">
                  Probing localhost:11434 to establish local AI link. Please wait.
                </p>
              </div>
            )}
            
            {connectionState === 'connected' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  Successfully Connected
                </div>
                <p className="text-xs text-muted-foreground">
                  GridSense will now route AI extraction tasks to your local hardware.
                </p>
              </div>
            )}
            
            {connectionState === 'error' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <XCircle className="h-4 w-4" />
                  Connection Failed
                </div>
                <p className="text-xs text-muted-foreground">
                  Ensure Ollama is running and CORS is enabled via <code className="bg-muted px-1 py-0.5 rounded text-xs">OLLAMA_ORIGINS="*"</code>. See README for details.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface PreviewCardProps {
  previewData: { headers: string[], rows: Record<string, string>[] };
  onCancel: () => void;
  onStart: () => void;
}

export function PreviewCard({ previewData, onCancel, onStart }: PreviewCardProps) {
  const [page, setPage] = useState(0);
  const rowsPerPage = 100;
  const totalPages = Math.ceil(previewData.rows.length / rowsPerPage);
  
  const startIndex = page * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, previewData.rows.length);
  const visibleRows = previewData.rows.slice(startIndex, endIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is interacting with some input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        onStart();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart, onCancel]);

  return (
    <Card className="border-border/50 bg-card shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Preview Raw Data</CardTitle>
        <CardDescription className="text-sm">We parsed {previewData.rows.length} rows and {previewData.headers.length} columns. Review the sample below before extraction.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border overflow-auto max-w-full max-h-[400px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card/80 backdrop-blur-md shadow-sm">
              <tr className="border-b">
                {previewData.headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary whitespace-nowrap bg-primary/5">{h}</th>
                ))}
              </tr>
            </thead>
            <AnimatePresence mode="wait">
              <motion.tbody
                key={page}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                {visibleRows.map((row, i) => (
                  <tr key={startIndex + i} className="border-b hover:bg-primary/5 transition-colors">
                    {previewData.headers.map((h, j) => (
                      <td key={j} className="px-4 py-3 whitespace-nowrap max-w-[300px] truncate text-sm text-foreground">{row[h] || ''}</td>
                    ))}
                  </tr>
                ))}
              </motion.tbody>
            </AnimatePresence>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Showing rows {startIndex + 1} to {endIndex} out of {previewData.rows.length} total.
          </div>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 0} 
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === totalPages - 1} 
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" onClick={onCancel}>
              Cancel <kbd className="ml-2 px-1.5 py-0.5 rounded-sm bg-muted text-[10px] text-muted-foreground border border-border">Esc</kbd>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={onStart}>
              Start AI Extraction <kbd className="ml-2 px-1.5 py-0.5 rounded-sm bg-primary-foreground/20 text-[10px] text-primary-foreground border border-primary-foreground/30">Enter</kbd>
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}

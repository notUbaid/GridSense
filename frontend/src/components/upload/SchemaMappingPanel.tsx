import React from 'react';
import { SchemaMapping } from '@/hooks/useProcessing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SchemaMappingPanelProps {
  mapping: SchemaMapping | null;
}

export function SchemaMappingPanel({ mapping }: SchemaMappingPanelProps) {
  if (!mapping || mapping.mapping.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full mt-6"
    >
      <Card className="border-primary/20 bg-card shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <BrainCircuit className="w-32 h-32" />
        </div>
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BrainCircuit className="w-5 h-5 text-primary" />
                AI Schema Understanding
              </CardTitle>
              <CardDescription className="mt-1">
                The model has inferred the structure of your CSV headers and mapped them to the CRM schema.
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Confidence</span>
              <div className="flex items-center gap-2">
                <Progress value={mapping.overallConfidence} className="w-24 h-2 bg-muted" />
                <span className="text-sm font-bold text-primary">{mapping.overallConfidence}%</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mapping.mapping.map((m, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 w-full">
                  <span className="text-sm font-medium truncate w-full" title={m.source}>{m.source}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Badge variant="secondary" className="shrink-0 font-mono text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                    {m.target}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PreviewCardProps {
  previewData: { headers: string[], rows: Record<string, string>[] };
  onCancel: () => void;
  onStart: () => void;
}

export function PreviewCard({ previewData, onCancel, onStart }: PreviewCardProps) {
  return (
    <Card className="shadow-lg border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader>
        <CardTitle>Preview Raw Data</CardTitle>
        <CardDescription>We successfully parsed {previewData.rows.length} rows. Please review a sample below before starting AI extraction.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border overflow-x-auto max-w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {previewData.headers.slice(0, 8).map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
                {previewData.headers.length > 8 && <th className="px-4 py-3 text-left font-medium text-muted-foreground">...</th>}
              </tr>
            </thead>
            <tbody>
              {previewData.rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-b">
                  {previewData.headers.slice(0, 8).map((h, j) => (
                    <td key={j} className="px-4 py-3 whitespace-nowrap max-w-[150px] truncate">{row[h] || ''}</td>
                  ))}
                  {previewData.headers.length > 8 && <td className="px-4 py-3">...</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onStart}>Start AI Extraction</Button>
        </div>
      </CardContent>
    </Card>
  );
}

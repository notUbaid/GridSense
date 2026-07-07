import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CrmRecord } from '@/types/schema';
import { motion, Variants } from 'framer-motion';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

const tableContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const rowItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface ResultsTableProps {
  data: CrmRecord[];
}

export function ResultsTable({ data }: ResultsTableProps) {
  const columns = React.useMemo(
    () => [
      { accessorKey: 'created_at', header: 'Created At' },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'country_code', header: 'Country Code' },
      { accessorKey: 'mobile_without_country_code', header: 'Mobile' },
      { accessorKey: 'company', header: 'Company' },
      { accessorKey: 'city', header: 'City' },
      { accessorKey: 'state', header: 'State' },
      { accessorKey: 'country', header: 'Country' },
      { accessorKey: 'lead_owner', header: 'Lead Owner' },
      { accessorKey: 'crm_status', header: 'CRM Status' },
      { accessorKey: 'crm_note', header: 'Note' },
      { accessorKey: 'data_source', header: 'Data Source' },
      { accessorKey: 'possession_time', header: 'Possession Time' },
      { accessorKey: 'description', header: 'Description' },
      {
        id: 'actions',
        header: '',
        cell: ({ row }: { row: { original: CrmRecord } }) => (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(JSON.stringify(row.original, null, 2));
              toast.success('Copied row data to clipboard');
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-md bg-muted/10 border-dashed">
        <p className="text-sm font-medium text-foreground">No records to display</p>
        <p className="text-sm text-muted-foreground mt-1">Data will appear here once extraction finishes.</p>
      </div>
    );
  }

  const exportCsv = () => {
    const headers = columns.map(c => c.header).join(',');
    const rows = data.map(row => 
      columns.map(c => `"${String(row[c.accessorKey as keyof CrmRecord] || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'gridsense_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gridsense_export_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-base font-semibold text-foreground">Extracted Records ({data.length})</h3>
        <div className="flex items-center space-x-2">
          <Button onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            toast.success('Copied all JSON to clipboard');
          }} variant="ghost" size="sm" className="h-8 hidden sm:flex">Copy JSON</Button>
          <Button onClick={exportJson} variant="outline" size="sm" className="h-8 hidden sm:flex">Download JSON</Button>
          <Button onClick={exportCsv} variant="outline" size="sm" className="h-8">Export CSV</Button>
        </div>
      </div>
      <div className="rounded-md border bg-card overflow-x-auto max-w-full max-h-[600px] overflow-y-auto relative">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="whitespace-nowrap text-xs font-medium uppercase tracking-wider text-muted-foreground py-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <motion.tbody
            variants={tableContainer}
            initial="hidden"
            animate="show"
            className="[&_tr:last-child]:border-0"
          >
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <motion.tr
                  variants={rowItem}
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="border-b transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap max-w-[200px] truncate text-sm py-3 text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </motion.tr>
              ))
            ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
          </motion.tbody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground flex items-center">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

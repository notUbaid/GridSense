import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CrmRecord } from '@/types/schema';

interface ResultsTableProps {
  data: CrmRecord[];
}

export function ResultsTable({ data }: ResultsTableProps) {
  const columns = React.useMemo(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'company', header: 'Company' },
      { accessorKey: 'country_code', header: 'Country Code' },
      { accessorKey: 'mobile_without_country_code', header: 'Mobile' },
      { accessorKey: 'city', header: 'City' },
      { accessorKey: 'state', header: 'State' },
      { accessorKey: 'country', header: 'Country' },
      { accessorKey: 'lead_owner', header: 'Lead Owner' },
      { accessorKey: 'crm_status', header: 'CRM Status' },
      { accessorKey: 'data_source', header: 'Data Source' },
      { accessorKey: 'crm_note', header: 'Note' },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
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

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-base font-semibold text-foreground">Extracted Records ({data.length})</h3>
        <Button onClick={exportCsv} variant="outline" size="sm" className="h-8">Export CSV</Button>
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
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap max-w-[200px] truncate text-sm py-3 text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
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

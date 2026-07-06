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
    return <div className="p-8 text-center text-muted-foreground">No records to display.</div>;
  }

  const exportCsv = () => {
    const headers = columns.map(c => c.header).join(',');
    const rows = data.map(row => 
      columns.map(c => `"${String((row as any)[c.accessorKey] || '').replace(/"/g, '""')}"`).join(',')
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
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-lg font-medium">Extracted Records ({data.length})</h3>
        <Button onClick={exportCsv} variant="secondary">Export to CSV</Button>
      </div>
      <div className="rounded-md border overflow-x-auto max-w-full">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="whitespace-nowrap">
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
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap max-w-[200px] truncate">
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

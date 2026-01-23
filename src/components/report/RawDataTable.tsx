import { cn } from "@/lib/utils";

interface RawDataTableProps {
    data: any[];
    columns?: string[];
    className?: string;
}

export function RawDataTable({ data, columns, className }: RawDataTableProps) {
    if (!data || data.length === 0) {
        return null;
    }

    // Auto-detect columns if not provided
    const tableColumns = columns || Array.from(
        new Set(data.flatMap(item => Object.keys(item || {})))
    );

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return "-";
        if (typeof value === "object") {
            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        }
        return String(value);
    };

    return (
        <div className={cn("rounded-md border overflow-hidden", className)}>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            {tableColumns.map((col) => (
                                <th key={col} className="h-9 px-3 font-medium whitespace-nowrap border-b">
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.map((row, idx) => (
                            <tr
                                key={idx}
                                className="hover:bg-muted/30 transition-colors"
                                style={{
                                    // Zebra striping using CSS variable or simple even/odd logic
                                    backgroundColor: idx % 2 === 1 ? 'rgba(0,0,0,0.02)' : 'transparent'
                                }}
                            >
                                {tableColumns.map((col) => (
                                    <td key={col} className="p-3 align-top max-w-[300px] truncate" title={formatValue(row[col])}>
                                        {formatValue(row[col])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

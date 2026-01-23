import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { numberFormatter } from "@/lib/numberFormatter";

interface Column {
    key: string;
    header: string;
    align?: 'left' | 'right' | 'center';
    format?: 'integer' | 'decimal' | 'percentage' | 'none';
}

interface StyledTableProps {
    columns: Column[];
    data: Record<string, any>[];
    className?: string;
}

/**
 * Professional table with zebra striping, hover states, and proper formatting
 */
export function StyledTable({ columns, data, className }: StyledTableProps) {
    if (!data || data.length === 0) {
        return null;
    }
    const formatValue = (value: any, format?: Column['format']): string => {
        if (value === null || value === undefined) return '-';

        if (typeof value === 'number') {
            switch (format) {
                case 'integer':
                    return numberFormatter.integer(value);
                case 'decimal':
                    return numberFormatter.decimal(value);
                case 'percentage':
                    return numberFormatter.percentageValue(value);
                default:
                    return numberFormatter.smart(value);
            }
        }

        return String(value);
    };

    return (
        <div className={cn("overflow-x-auto rounded-lg border", className)}>
            <table className="w-full">
                {/* Header */}
                <thead>
                    <tr className="bg-muted/50">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={cn(
                                    "px-4 py-3 text-sm font-semibold",
                                    col.align === 'right' && "text-right",
                                    col.align === 'center' && "text-center",
                                    col.align === 'left' && "text-left",
                                    !col.align && "text-left"
                                )}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>

                {/* Body */}
                <tbody>
                    {data.map((row, rowIdx) => (
                        <tr
                            key={rowIdx}
                            className={cn(
                                "transition-colors hover:bg-muted/30",
                                rowIdx % 2 === 0 && "bg-muted/10" // Zebra striping
                            )}
                        >
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className={cn(
                                        "px-4 py-3 text-sm",
                                        col.align === 'right' && "text-right font-mono",
                                        col.align === 'center' && "text-center",
                                        col.align === 'left' && "text-left",
                                        !col.align && "text-left"
                                    )}
                                >
                                    {formatValue(row[col.key], col.format)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

        </div>
    );
}

import { cn } from "@/lib/utils";

interface DataTableProps {
    headers: string[];
    rows: (string | number)[][];
    className?: string;
    highlightedRows?: number[];
}

export function DataTable({ headers, rows, className, highlightedRows = [] }: DataTableProps) {
    return (
        <div className={cn("overflow-x-auto", className)}>
            <table className="w-full font-[family-name:var(--font-lab)] text-sm">
                <thead>
                    <tr className="border-b border-[hsl(var(--lab-border))]">
                        {headers.map((header, index) => (
                            <th
                                key={index}
                                className="px-3 py-2 text-left text-[hsl(var(--lab-signal))] font-medium"
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className={cn(
                                "border-b border-[hsl(var(--lab-border))]/30 transition-colors",
                                highlightedRows.includes(rowIndex) && "bg-[hsl(var(--lab-signal))]/10",
                                "hover:bg-[hsl(var(--lab-silver))]/5"
                            )}
                        >
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    className="px-3 py-2 text-[hsl(var(--lab-silver))]"
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

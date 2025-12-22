import { useState, useMemo, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T;
  header: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  title?: string;
  columns: Column<T>[];
  data: T[];
  expandableContent?: (row: T) => ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  columns,
  data,
  expandableContent,
}: DataTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: "asc" | "desc";
  } | null>(null);

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (key: keyof T) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === "asc"
          ? { key, direction: "desc" }
          : null;
      }
      return { key, direction: "asc" };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case "exceeding":
        return "bg-teal-50 text-teal-600 border border-teal-200";
      case "on track":
        return "bg-navy-50 text-navy-800 border border-navy-100";
      case "at risk":
        return "bg-copper-50 text-copper-600 border border-copper-100";
      case "off track":
        return "bg-destructive/10 text-destructive border border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  return (
    <div className="w-full overflow-hidden bg-card rounded-sm border border-border shadow-soft">
      {title && (
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
          <h4 className="font-serif text-lg text-navy-900">{title}</h4>
          <div className="text-xs text-muted-foreground font-medium">
            {data.length} Records
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              {expandableContent && <th className="w-10 px-4 py-4" />}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-6 py-4 font-medium tracking-wider",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                    column.sortable && "cursor-pointer hover:text-foreground transition-colors"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={cn("flex items-center gap-1", column.align === "right" && "justify-end")}>
                    {column.header}
                    {column.sortable && (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => (
              <>
                <tr
                  key={rowIndex}
                  className={cn(
                    "border-b border-border/50 hover:bg-muted/30 transition-colors",
                    expandableContent && "cursor-pointer"
                  )}
                  onClick={() => expandableContent && toggleRow(rowIndex)}
                >
                  {expandableContent && (
                    <td className="px-4 py-4">
                      <motion.div
                        animate={{ rotate: expandedRows.has(rowIndex) ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </td>
                  )}
                  {columns.map((column) => {
                    const value = row[column.key];
                    const isStatus = String(column.key).toLowerCase() === "status";

                    return (
                      <td
                        key={String(column.key)}
                        className={cn(
                          "px-6 py-4",
                          column.align === "right" && "text-right",
                          column.align === "center" && "text-center"
                        )}
                      >
                        {column.render ? (
                          column.render(value, row)
                        ) : isStatus ? (
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", getStatusColor(String(value)))}>
                            {String(value)}
                          </span>
                        ) : (
                          <span className="text-foreground">{String(value)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <AnimatePresence>
                  {expandableContent && expandedRows.has(rowIndex) && (
                    <tr>
                      <td colSpan={columns.length + 1}>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-muted/20 px-6 py-6 overflow-hidden"
                        >
                          {expandableContent(row)}
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useMemo, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowUpDown, Download, Eye, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Column<T> {
  key: keyof T;
  header: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  title?: string;
  subtitle?: string;
  columns: Column<T>[];
  data: T[];
  expandableContent?: (row: T) => ReactNode;
  showDownload?: boolean;
  onDownload?: () => void;
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  subtitle,
  columns,
  data,
  expandableContent,
  showDownload = true,
  onDownload,
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

  const getStatusStyles = (status: string) => {
    const statusLower = status?.toLowerCase?.() || "";
    switch (statusLower) {
      case "exceeding":
        return "bg-teal-100 text-teal-700 border-teal-200";
      case "on track":
        return "bg-navy-50 text-navy-800 border-navy-100";
      case "at risk":
        return "bg-copper-100 text-copper-700 border-copper-200";
      case "off track":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getActionStyles = (action: string) => {
    const actionLower = action?.toLowerCase?.() || "";
    switch (actionLower) {
      case "expand":
        return "text-teal-600";
      case "monitor":
        return "text-navy-700";
      case "intervene":
        return "text-copper-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full overflow-hidden bg-card rounded-sm border border-border shadow-soft"
    >
      {/* Header */}
      {title && (
        <div className="px-6 py-5 border-b border-border bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="font-serif text-lg font-semibold text-navy-900">{title}</h4>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                {data.length} Records
              </span>
              {showDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                  className="gap-2 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {expandableContent && <th className="w-12 px-4 py-4" />}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                    column.sortable && "cursor-pointer hover:text-foreground transition-colors select-none"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={cn(
                    "flex items-center gap-1.5",
                    column.align === "right" && "justify-end",
                    column.align === "center" && "justify-center"
                  )}>
                    {column.header}
                    {column.sortable && (
                      <ArrowUpDown className={cn(
                        "h-3 w-3 transition-opacity",
                        sortConfig?.key === column.key ? "opacity-100" : "opacity-40"
                      )} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => (
              <motion.tr
                key={rowIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rowIndex * 0.05, duration: 0.3 }}
                className={cn(
                  "border-b border-border/40 hover:bg-muted/20 transition-colors",
                  expandableContent && "cursor-pointer"
                )}
                onClick={() => expandableContent && toggleRow(rowIndex)}
              >
                {expandableContent && (
                  <td className="px-4 py-4">
                    <motion.div
                      animate={{ rotate: expandedRows.has(rowIndex) ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-center"
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </td>
                )}
                {columns.map((column) => {
                  const value = row[column.key];
                  const keyStr = String(column.key).toLowerCase();
                  const isStatus = keyStr === "status";
                  const isAction = keyStr === "action";

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
                        <span className={cn(
                          "inline-flex px-3 py-1 rounded-full text-xs font-semibold border",
                          getStatusStyles(String(value))
                        )}>
                          {String(value)}
                        </span>
                      ) : isAction ? (
                        <span className={cn(
                          "text-sm font-medium",
                          getActionStyles(String(value))
                        )}>
                          {String(value)}
                        </span>
                      ) : (
                        <span className="text-foreground">{String(value)}</span>
                      )}
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expandableContent && sortedData.map((row, rowIndex) => (
          expandedRows.has(rowIndex) && (
            <motion.div
              key={`expanded-${rowIndex}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-muted/20 border-b border-border overflow-hidden"
            >
              <div className="px-6 py-6">
                {expandableContent(row)}
              </div>
            </motion.div>
          )
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
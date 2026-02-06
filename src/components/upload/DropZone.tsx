import { useState, useCallback, useRef } from "react";
import { Upload, FileUp, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DropZoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [".csv", ".xlsx", ".xls"];
const ACCEPTED_MIME = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DropZone({
  file,
  onFileSelect,
  onFileClear,
  disabled,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFileSelect(dropped);
    },
    [disabled, onFileSelect],
  );

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFileSelect(selected);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={onFileClear}
                disabled={disabled}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={cn(
              "relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 p-12 text-center group",
              isDragging
                ? "border-blue-500 bg-blue-500/5"
                : "border-border hover:border-blue-500/50 hover:bg-card/50",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleChange}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-4">
              <div
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
                  isDragging
                    ? "bg-blue-500/10"
                    : "bg-secondary group-hover:bg-blue-500/10",
                )}
              >
                {isDragging ? (
                  <FileUp className="w-8 h-8 text-blue-500" />
                ) : (
                  <Upload className="w-8 h-8 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {isDragging
                    ? "Drop your file here"
                    : "Drag and drop your dataset"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Or click to browse. Accepts CSV, XLSX, XLS
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

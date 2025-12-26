import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";

interface ScopeLockModalProps {
  open: boolean;
  dimension?: string;
  onAcknowledge: () => void;
}

export function ScopeLockModal({ open, dimension, onAcknowledge }: ScopeLockModalProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(value) => { if (!value) onAcknowledge(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl">
          <AlertDialog.Title className="text-lg font-semibold">Scope Lock</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            This analysis dimension{dimension ? ` (${dimension})` : ""} was excluded in the Task Contract.
            Create a new run with an updated contract if you need to explore it.
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end">
            <Button onClick={onAcknowledge}>Got it</Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

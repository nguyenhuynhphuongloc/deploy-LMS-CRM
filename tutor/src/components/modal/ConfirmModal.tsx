"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { JSX, useState } from "react";

/**
 * A modal that asks the user if they are sure they want to submit their
 * answers and switch to the next skill.
 *
 * @param {React.ReactNode} children The content of the modal.
 * @param {(e: React.MouseEvent<HTMLButtonElement>) => Promise<void>} onSubmit
 *   The function to call when the user clicks submit.
 * @returns {JSX.Element} The modal element.
 */
const ConfirmModal = ({
  children,
  onSubmit,
  onCancel,
  isPending,
  title = "Xác nhận",
  description = "Bạn có chắc chắn muốn thực hiện hành động này không?",
  cancelText = "Hủy",
  confirmText = "Xác nhận",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  children: React.ReactNode;
  onSubmit: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  onCancel?: () => void;
  isPending?: boolean;
  title?: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}): JSX.Element => {
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    await onSubmit(e);
    setOpen(false);
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onCancel) onCancel();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="font-sans">
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-[24px] font-bold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#6D737A] text-[16px] text-center">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex items-center justify-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="rounded-[12px] text-[16px] font-bold mt-0"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[#E72929] hover:bg-[#E72929]/90 rounded-[12px] text-[16px] font-bold"
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" />
                Đang xử lý...
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmModal;

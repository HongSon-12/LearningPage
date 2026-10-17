"use client";
import { useRef, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export default function AdminDialog({
  title,
  subtitle,
  children,
  onClose,
  returnFocusId,
  initialFocusId,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  returnFocusId?: string;
  initialFocusId?: string;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const focusId = useRef<string | undefined>(undefined);
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          focusId.current = returnFocusId;
          returnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          if (initialFocusId) {
            const initial = document.getElementById(initialFocusId);
            if (initial) {
              event.preventDefault();
              initial.focus({ preventScroll: true });
            }
          }
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = focusId.current
            ? document.getElementById(focusId.current)
            : returnFocus.current;
          if (target?.isConnected) target.focus();
          else document.getElementById("admin-main")?.focus();
        }}
        className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogHeader className="border-b px-5 py-5 pr-16 text-left sm:px-6">
          <DialogTitle className="leading-6">{title}</DialogTitle>
          <DialogDescription>
            {subtitle ||
              "Xem và cập nhật thông tin trong phạm vi được phân quyền."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(90dvh-120px)] overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

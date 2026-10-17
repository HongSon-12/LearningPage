"use client";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-lg rounded-xl border bg-card p-8 text-center"
    >
      <AlertCircle className="mx-auto mb-4 size-8 text-destructive" />
      <h1 className="text-xl font-semibold">Không thể tải dữ liệu</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">
        Vui lòng thử lại. Nếu lỗi tiếp tục, hãy liên hệ quản trị hệ thống.
      </p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertFormDialog } from "@/components/alert-form-dialog";

interface Props {
  courseId: string;
  courseName: string;
  bookingWindowDays?: number | null;
  defaultDate?: string;
}

export function CreateAlertButton({
  courseId,
  courseName,
  bookingWindowDays,
  defaultDate,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]"
      >
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        Create Alert
      </Button>
      <AlertFormDialog
        open={open}
        onOpenChange={setOpen}
        courseId={courseId}
        courseName={courseName}
        bookingWindowDays={bookingWindowDays}
        defaultDate={defaultDate}
      />
    </>
  );
}

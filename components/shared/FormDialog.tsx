'use client';
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "default"
}: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  title: string,
  description?: string,
  children: React.ReactNode,
  size?: "sm" | "default" | "lg" | "xl"
}) {
  const sizeClasses = {
    sm: "max-w-md",
    default: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sizeClasses[size]} max-h-[90vh]`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="pr-4">
            {children}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

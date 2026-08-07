"use client";

import type { ComponentProps } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps extends ComponentProps<typeof Button> {
  /** Owned by the caller, so only one copy is ever confirmed at a time. */
  copied: boolean;
  /** Omit for an icon-only button, and give it an `aria-label` instead. */
  label?: string;
  copiedLabel?: string;
}

/** A copy action that acknowledges itself by swapping icon and wording. */
export function CopyButton({
  copied,
  label,
  copiedLabel = "Copied",
  ...props
}: CopyButtonProps) {
  return (
    <Button type="button" className="h-11" {...props}>
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
      {label && (copied ? copiedLabel : label)}
    </Button>
  );
}

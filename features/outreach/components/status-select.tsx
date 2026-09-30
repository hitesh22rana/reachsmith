"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, type OutreachStatus } from "../validation";

const STATUS_KEYS = Object.keys(STATUS_LABELS) as OutreachStatus[];

// One status editor, used by the pipeline row and the per-target history. The
// labels lived beside each copy and had to be kept in agreement by hand.
export function StatusSelect({
  value,
  ariaLabel,
  disabled,
  onChange,
}: {
  value: OutreachStatus;
  ariaLabel: string;
  disabled: boolean;
  onChange: (status: OutreachStatus) => void;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(status) => onChange((status as OutreachStatus | null) ?? value)}
    >
      <SelectTrigger aria-label={ariaLabel} className="w-36">
        <SelectValue>{STATUS_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {STATUS_KEYS.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

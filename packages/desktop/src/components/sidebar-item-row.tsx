import type { ComponentProps } from "react";
import { Icon } from "./icons.js";

interface SidebarItemRowProps {
  active?: boolean;
  deleteLabel: string;
  disabled: boolean;
  expanded?: boolean;
  label: string;
  startIcon?: ComponentProps<typeof Icon>["name"];
  onDelete(): void;
  onSelect(): void;
}

export function SidebarItemRow(props: SidebarItemRowProps) {
  return (
    <div className="sidebar-item-row">
      <button
        aria-current={props.active ? "page" : undefined}
        aria-expanded={props.expanded}
        className="sidebar-item-select"
        disabled={props.disabled}
        onClick={props.onSelect}
        type="button"
      >
        {props.startIcon === undefined ? null : <Icon name={props.startIcon} />}
        <span title={props.label}>{props.label}</span>
      </button>
      <button
        aria-label={props.deleteLabel}
        className="sidebar-item-delete"
        disabled={props.disabled}
        onClick={props.onDelete}
        type="button"
      >
        <Icon name="trash" />
      </button>
    </div>
  );
}

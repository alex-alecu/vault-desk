import type { ComponentProps } from "react";
import { Icon } from "./icons.js";

interface SidebarItemRowProps {
  active?: boolean;
  deleteLabel: string;
  disabled: boolean;
  expanded?: boolean;
  label: string;
  startActionLabel?: string;
  startIcon?: ComponentProps<typeof Icon>["name"];
  onDelete(): void;
  onSelect(): void;
  onStartAction?(): void;
}

export function SidebarItemRow(props: SidebarItemRowProps) {
  const hasStartAction = props.startIcon !== undefined && props.onStartAction !== undefined;
  return (
    <div className={`sidebar-item-row${hasStartAction ? " sidebar-item-row-with-start" : ""}`}>
      {hasStartAction ? (
        <button
          aria-label={props.startActionLabel}
          className="sidebar-item-start"
          disabled={props.disabled}
          onClick={props.onStartAction}
          type="button"
        >
          <Icon name={props.startIcon ?? "folder"} />
        </button>
      ) : null}
      <button
        aria-current={props.active ? "page" : undefined}
        aria-expanded={props.expanded}
        className="sidebar-item-select"
        disabled={props.disabled}
        onClick={props.onSelect}
        type="button"
      >
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

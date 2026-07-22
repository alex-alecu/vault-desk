import type { AgentEvent } from "@vault/shared";
import type { TimelineItem } from "./state.js";

function bounded(label: string, value: string | null, limit: number): string | undefined {
  if (value === null || value.length === 0) return undefined;
  return `${label}:\n${value.length <= limit ? value : `${value.slice(0, limit)}\n… output truncated`}`;
}

function eventDetail(event: AgentEvent): string | undefined {
  const detail = (
    event.type === "execution.started"
      ? [bounded("Code", event.code, 12_000)]
      : event.type === "execution.completed"
        ? [
            bounded("Output", event.stdout, 20_000),
            bounded("Error output", event.stderr, 20_000),
            event.termination === null ? undefined : `Termination: ${event.termination}`,
          ]
        : []
  )
    .filter((item): item is string => item !== undefined)
    .join("\n\n");
  return detail.length === 0 ? undefined : detail;
}

export function eventItem(event: AgentEvent): TimelineItem {
  const detail = eventDetail(event);
  return {
    createdAt: event.createdAt,
    eventType: event.type,
    id: event.id,
    kind: "activity",
    text: event.summary,
    ...(detail === undefined ? {} : { detail }),
  };
}

export function selectAdjacentTab<T extends string>(
  event: React.KeyboardEvent<HTMLButtonElement>,
  current: T,
  tabs: readonly T[],
  select: (tab: T) => void,
): void {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const offset = event.key === "ArrowRight" ? 1 : -1;
  const index = tabs.indexOf(current);
  const next = tabs[(index + offset + tabs.length) % tabs.length];
  if (next === undefined) return;
  select(next);
  requestAnimationFrame(() => {
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
      ?.focus();
  });
}

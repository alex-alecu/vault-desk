interface IconProps {
  name: "activity" | "add" | "chevron" | "close" | "folder" | "message" | "send" | "trash";
}

const paths: Record<IconProps["name"], string> = {
  activity: "M5 7h14M5 12h14M5 17h8",
  add: "M12 5v14M5 12h14",
  chevron: "m8 10 4 4 4-4",
  close: "M6 6l12 12M18 6 6 18",
  folder: "M3 7h6l2 2h10v10H3z",
  message: "M4 5h16v11H8l-4 4z",
  send: "m5 12 14-7-4 14-3-6z",
  trash: "M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 10v7m4-7v7",
};

export function Icon({ name }: IconProps) {
  return (
    <svg aria-hidden="true" className={`icon icon-${name}`} viewBox="0 0 24 24">
      <path d={paths[name]} />
    </svg>
  );
}

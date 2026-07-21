interface IconProps {
  name: "add" | "chevron" | "folder" | "message" | "send";
}

const paths: Record<IconProps["name"], string> = {
  add: "M12 5v14M5 12h14",
  chevron: "m8 10 4 4 4-4",
  folder: "M3 7h6l2 2h10v10H3z",
  message: "M4 5h16v11H8l-4 4z",
  send: "m5 12 14-7-4 14-3-6z",
};

export function Icon({ name }: IconProps) {
  return (
    <svg aria-hidden="true" className={`icon icon-${name}`} viewBox="0 0 24 24">
      <path d={paths[name]} />
    </svg>
  );
}

// Values truncate rather than wrap: this is a confirmation of what was
// entered, not a second place to read a long message, and the full text is one
// hover away via the title attribute.
//
// The truncation needs flex-1 on the value, not just min-w-0. A job link is
// one unbreakable 100-character token, so its max-content width is what sizes
// the row; with only min-w-0 the row grows to fit it and pushes the whole
// dialog wider than its own max-width. flex-1 (flex-basis 0) makes the value
// take only the space left over after the label, which is what gives
// overflow something to clip and ellipsize.
export function ReviewList({
  items,
  empty,
}: {
  items: { label: string; value: string }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <dl className="flex min-w-0 flex-col gap-2 rounded-xl border bg-muted/50 p-4">
      {items.map((item) => {
        const lines = item.value
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line !== "");
        return (
          <div
            key={item.label}
            className="flex min-w-0 items-baseline justify-between gap-4 text-sm"
          >
            <dt className="min-w-0 shrink-0 font-medium text-muted-foreground">
              <span className="block truncate" title={item.label}>
                {item.label}
              </span>
            </dt>
            {lines.length > 1 ? (
              <dd className="flex min-w-0 flex-1 flex-col items-end gap-0.5">
                {lines.map((line, index) => (
                  <span
                    key={`${index}-${line}`}
                    className="max-w-full truncate"
                    title={line}
                  >
                    {line}
                  </span>
                ))}
              </dd>
            ) : lines[0] ? (
              <dd className="min-w-0 flex-1 truncate text-right" title={lines[0]}>
                {lines[0]}
              </dd>
            ) : (
              // A blank cell reads as a rendering fault. Say it was left empty.
              <dd className="min-w-0 flex-1 truncate text-right text-muted-foreground">
                Not set
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}

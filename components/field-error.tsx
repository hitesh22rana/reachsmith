// The validation message under one form control. Five forms validated the same
// schema and rendered this at two sizes, so the same field's error changed size
// between the add and edit dialogs. One component, one size.
export function FieldError({ message }: { message: string | undefined }) {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

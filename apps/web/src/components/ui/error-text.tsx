export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-sm text-red-600" role="alert">
      {children}
    </p>
  );
}

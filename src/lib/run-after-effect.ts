/** Effect gövdesinde sync setState tetiklememek için (react-hooks/set-state-in-effect). */
export function runAfterEffect(fn: () => void | Promise<void>): () => void {
  const id = window.setTimeout(() => {
    void fn();
  }, 0);
  return () => window.clearTimeout(id);
}

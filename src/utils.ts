
export function isTruishString(value: string): boolean {
  const v = value.toLowerCase().trim();
  if (['true', '1', 'yes', 'y'].includes(v)) return true;
  if (['false', '0', 'no', 'n'].includes(v)) return false;
  throw new Error('Failed to coerce value to boolean: %{value}');
}

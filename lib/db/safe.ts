export function ensureSingle<T>(
  data: T | null,
  error: { message: string } | null,
  context: string,
): T {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`${context}: No data returned`);
  }

  return data;
}

export function ensureMaybeSingle<T>(
  data: T | null,
  error: { message: string } | null,
  context: string,
): T | null {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }

  return data;
}

export function ensureArray<T>(
  data: T[] | null,
  error: { message: string } | null,
  context: string,
): T[] {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}
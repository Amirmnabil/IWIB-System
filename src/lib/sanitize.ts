export function sanitizePayload(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === "" || value === "undefined") {
      sanitized[key] = null;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      sanitized[key] = sanitizePayload(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        (item !== null && typeof item === 'object' && !(item instanceof Date)) ? sanitizePayload(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

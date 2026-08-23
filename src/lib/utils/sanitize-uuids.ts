export const sanitizeUUIDs = (input: any): any => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (Array.isArray(input)) {
    return input.map(sanitizeUUIDs);
  }
  
  if (input !== null && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([k, v]) => [
        k,
        typeof v === 'string' && v.trim() === '' && k !== 'last_name' && k !== 'first_name'
          ? null
          : typeof v === 'string' && k.endsWith('_id') && k !== 'plan_id' && k !== 'national_id' && k !== 'principle_id' && !UUID_REGEX.test(v)
          ? null
          : v
      ])
    );
  }
  
  return input;
};

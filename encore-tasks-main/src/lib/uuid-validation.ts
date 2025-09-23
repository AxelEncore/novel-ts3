/**
 * Validates if a string is a valid UUID v4 format
 * @param uuid - The string to validate
 * @returns boolean - true if valid UUID, false otherwise
 */
export function isValidUUID(uuid: string | undefined | null): boolean {
  if (!uuid) return false;
  
  // UUID v4 regex pattern
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where x is any hexadecimal digit and y is one of 8, 9, A, or B
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // Also accept standard UUID format (not just v4)
  const generalUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return generalUuidRegex.test(uuid);
}

/**
 * Validates multiple UUIDs
 * @param uuids - Array of strings to validate
 * @returns boolean - true if all are valid UUIDs, false otherwise
 */
export function areValidUUIDs(uuids: string[]): boolean {
  return uuids.every(uuid => isValidUUID(uuid));
}

/**
 * Filters out invalid UUIDs from an array
 * @param uuids - Array of strings to filter
 * @returns Array of valid UUID strings
 */
export function filterValidUUIDs(uuids: string[]): string[] {
  return uuids.filter(uuid => isValidUUID(uuid));
}

/**
 * Checks if a string looks like a temporary/client-generated ID
 * (usually not UUIDs, like "temp-123", "new-1", etc.)
 * @param id - The ID to check
 * @returns boolean - true if it looks like a temporary ID
 */
export function isTemporaryId(id: string): boolean {
  // Common patterns for temporary IDs
  const tempPatterns = [
    /^temp[-_]/i,
    /^new[-_]/i,
    /^client[-_]/i,
    /^local[-_]/i,
    /^[0-9]+$/,  // Just numbers
    /^[a-z0-9]{1,10}$/i  // Short alphanumeric (like "7dt4p43tb")
  ];
  
  return tempPatterns.some(pattern => pattern.test(id));
}
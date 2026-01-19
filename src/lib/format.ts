// Formatting utilities

/**
 * Format a definition string to have proper spacing around slashes
 * Converts "/" to " / " for better readability
 */
export function formatDefinition(definition: string | null | undefined): string {
  if (!definition) return '';
  // Replace "/" with " / " but avoid double spaces
  return definition.replace(/\s*\/\s*/g, ' / ');
}

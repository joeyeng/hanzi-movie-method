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

/**
 * Extract the best/primary definition from a CC-CEDICT style definition string.
 * Filters out less useful entries like "used in...", "surname...", "variant of..." etc.
 */
export function getBestDefinition(definition: string | null | undefined): string {
  if (!definition) return '';
  
  // Split on "/" to get individual definitions
  const parts = definition.split('/').map(s => s.trim()).filter(s => s.length > 0);
  
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  
  // Patterns that indicate less useful definitions (to be deprioritized)
  const lessUsefulPatterns = [
    /^used in\s/i,           // "used in 自個兒|自个儿"
    /^see\s/i,               // "see 什麼"
    /^see also\s/i,          // "see also..."
    /^surname\s/i,           // "surname Neng"
    /^variant of\s/i,        // "variant of 個|个"
    /^old variant of\s/i,    // "old variant of..."
    /^same as\s/i,           // "same as..."
    /^abbr\.\s/i,            // "abbr. for..."
    /^abbr\s/i,              // "abbr for..."
    /^CL:/i,                 // Classifier indicator
    /^\(literary\)/i,        // Literary usage
    /^\(dialect\)/i,         // Dialect usage
  ];
  
  // Find the first "useful" definition
  for (const part of parts) {
    const isLessUseful = lessUsefulPatterns.some(pattern => pattern.test(part));
    if (!isLessUseful) {
      return part;
    }
  }
  
  // If all definitions are "less useful", return the first one anyway
  return parts[0];
}

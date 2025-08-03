/**
 * File Classification Utilities
 * Detects whether files contain Arabic-only content or Arabic-Urdu translation pairs
 */

/**
 * Check if a file has Arabic-Urdu translation pairs
 * @param {Object} fileContent - The parsed file content
 * @returns {boolean} - True if file has translation pairs, false if Arabic-only
 */
export const hasTranslationPairs = (fileContent) => {
  if (!fileContent || !fileContent.segments || !Array.isArray(fileContent.segments)) {
    return false;
  }

  // Check if all segments have both original_text and translated_text
  return fileContent.segments.every(segment => 
    segment.original_text && 
    segment.translated_text && 
    segment.translated_text.trim() !== ''
  );
};

/**
 * Get file classification status
 * @param {Object|Array} fileContent - The parsed file content or segments array
 * @returns {string} - 'arabic_only' | 'arabic_urdu_pairs' | 'unknown'
 */
export const getFileClassification = (fileContent) => {
  if (!fileContent) return 'unknown';
  
  // Handle both fileContent object and segments array
  let segments;
  if (Array.isArray(fileContent)) {
    segments = fileContent;
  } else if (fileContent.segments) {
    segments = fileContent.segments;
  } else {
    return 'unknown';
  }
  
  // Check if all segments have both original_text and translated_text
  const hasTranslations = segments.every(segment => 
    segment.original_text && 
    segment.translated_text && 
    segment.translated_text.trim() !== ''
  );
  
  if (hasTranslations) {
    return 'arabic_urdu_pairs';
  } else {
    return 'arabic_only';
  }
};

/**
 * Get file status display text
 * @param {string} classification - File classification
 * @returns {string} - Human readable status
 */
export const getFileStatusText = (classification) => {
  switch (classification) {
    case 'arabic_only':
      return 'Arabic-only - Ready for LLM translation';
    case 'arabic_urdu_pairs':
      return 'Arabic-Urdu pairs - Ready for evaluation';
    default:
      return 'Unknown file type';
  }
};

/**
 * Get file status color for UI
 * @param {string} classification - File classification
 * @returns {string} - Tailwind CSS color classes
 */
export const getFileStatusColor = (classification) => {
  switch (classification) {
    case 'arabic_only':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'arabic_urdu_pairs':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Get file status icon
 * @param {string} classification - File classification
 * @returns {string} - Icon name for Lucide React
 */
export const getFileStatusIcon = (classification) => {
  switch (classification) {
    case 'arabic_only':
      return 'Globe';
    case 'arabic_urdu_pairs':
      return 'CheckCircle';
    default:
      return 'FileText';
  }
};

/**
 * Filter files by classification
 * @param {Array} files - Array of file objects
 * @param {Array} fileContents - Array of file content objects
 * @param {string} classification - Classification to filter by
 * @returns {Array} - Filtered files
 */
export const filterFilesByClassification = (files, fileContents, classification) => {
  if (!files || !fileContents) return [];
  
  return files.filter(file => {
    const content = fileContents.find(fc => fc.file_id === file.file_id);
    if (!content) return false;
    
    return getFileClassification(content) === classification;
  });
}; 
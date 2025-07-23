/**
 * File Validation Utility
 * Used across SOT Upload, Config Create Function, and Reconciliation sections
 */

// Allowed file types
const ALLOWED_FILE_TYPES = ['.xlsx', '.csv', '.xlsb', '.xls'];
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 50MB in bytes

/**
 * Validates file type based on file extension
 * @param {File} file - The file to validate
 * @returns {Object} - {isValid: boolean, error: string}
 */
export const validateFileType = (file) => {
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided'
    };
  }

  const fileName = file.name.toLowerCase();
  const isValidType = ALLOWED_FILE_TYPES.some(type => fileName.endsWith(type));

  if (!isValidType) {
    return {
      isValid: false,
      error: `Invalid file type. Please upload files with extensions: ${ALLOWED_FILE_TYPES.join(', ')}`
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Validates file size
 * @param {File} file - The file to validate
 * @returns {Object} - {isValid: boolean, error: string}
 */
export const validateFileSize = (file) => {
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided'
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size (${fileSizeMB} MB) exceeds the maximum limit of ${MAX_FILE_SIZE_MB} MB`
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Validates a single file with both type and size checks
 * @param {File} file - The file to validate
 * @returns {Object} - {isValid: boolean, errors: string[]}
 */
export const validateSingleFile = (file) => {
  const errors = [];

  // Check file type
  const typeValidation = validateFileType(file);
  if (!typeValidation.isValid) {
    errors.push(typeValidation.error);
  }

  // Check file size
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.isValid) {
    errors.push(sizeValidation.error);
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    file: file
  };
};

/**
 * Validates multiple files
 * @param {FileList|File[]} files - The files to validate
 * @param {number} maxFiles - Maximum number of files allowed (default: 10)
 * @returns {Object} - {isValid: boolean, errors: string[], validFiles: File[], invalidFiles: File[]}
 */
export const validateMultipleFiles = (files, maxFiles = 10) => {
  const errors = [];
  const validFiles = [];
  const invalidFiles = [];

  if (!files || files.length === 0) {
    return {
      isValid: false,
      errors: ['No files selected'],
      validFiles: [],
      invalidFiles: []
    };
  }

  // Check maximum file count
  if (files.length > maxFiles) {
    errors.push(`Too many files selected. Maximum allowed: ${maxFiles}`);
  }

  // Validate each file
  Array.from(files).forEach((file, index) => {
    const validation = validateSingleFile(file);
    
    if (validation.isValid) {
      validFiles.push(file);
    } else {
      invalidFiles.push(file);
      validation.errors.forEach(error => {
        errors.push(`File "${file.name}": ${error}`);
      });
    }
  });

  return {
    isValid: errors.length === 0 && validFiles.length > 0,
    errors: errors,
    validFiles: validFiles,
    invalidFiles: invalidFiles
  };
};

/**
 * Gets formatted file size string
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size (e.g., "1.25 MB")
 */
export const getFormattedFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Quick validation function for simple use cases
 * @param {File} file - The file to validate
 * @returns {boolean} - True if file is valid
 */
export const isValidFile = (file) => {
  const validation = validateSingleFile(file);
  return validation.isValid;
};

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} - File extension with dot (e.g., ".xlsx")
 */
export const getFileExtension = (filename) => {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
};

/**
 * Check if file type is supported
 * @param {string} filename - The filename
 * @returns {boolean} - True if file type is supported
 */
export const isSupportedFileType = (filename) => {
  const extension = getFileExtension(filename);
  return ALLOWED_FILE_TYPES.includes(extension);
};

// Export constants for use in components
export const FILE_VALIDATION_CONSTANTS = {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES
}; 
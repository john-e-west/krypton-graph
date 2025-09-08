export const FILE_VALIDATION = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  allowedExtensions: ['.pdf', '.txt', '.md', '.docx'],
  maxFiles: 10
}

export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: "File exceeds 50MB limit",
  INVALID_TYPE: "File type not supported. Please upload PDF, TXT, MD, or DOCX files",
  UPLOAD_FAILED: "Upload failed. Please check your connection and try again",
  QUEUE_FULL: "Maximum 10 files can be uploaded at once",
  SERVER_ERROR: "Server error occurred. Please try again later"
}

export interface ValidationResult {
  isValid: boolean
  error?: string
}

export function validateFile(file: File): ValidationResult {
  // Check file size
  if (file.size > FILE_VALIDATION.maxSize) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.FILE_TOO_LARGE
    }
  }

  // Check file extension
  const fileName = file.name.toLowerCase()
  const hasValidExtension = FILE_VALIDATION.allowedExtensions.some(ext => 
    fileName.endsWith(ext)
  )

  if (!hasValidExtension) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_TYPE
    }
  }

  // Check MIME type
  if (!FILE_VALIDATION.allowedTypes.includes(file.type)) {
    // Some browsers might not recognize markdown MIME type correctly
    if (!fileName.endsWith('.md')) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.INVALID_TYPE
      }
    }
  }

  return {
    isValid: true
  }
}

export function validateFileList(files: File[]): ValidationResult {
  if (files.length > FILE_VALIDATION.maxFiles) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.QUEUE_FULL
    }
  }

  for (const file of files) {
    const result = validateFile(file)
    if (!result.isValid) {
      return result
    }
  }

  return {
    isValid: true
  }
}
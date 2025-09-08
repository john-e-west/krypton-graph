import { ValidationError } from './OntologyCodeGenerator'

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export class PythonValidator {
  async validate(code: string): Promise<ValidationResult> {
    const errors: ValidationError[] = []

    try {
      // Perform basic syntax validation
      const basicValidation = this.validateBasicSyntax(code)
      errors.push(...basicValidation.errors)

      // Validate imports
      const importValidation = this.validateImports(code)
      errors.push(...importValidation.errors)

      // Validate class definitions
      const classValidation = this.validateClassDefinitions(code)
      errors.push(...classValidation.errors)

      // Validate indentation
      const indentValidation = this.validateIndentation(code)
      errors.push(...indentValidation.errors)

      return {
        isValid: errors.filter(e => e.severity === 'error').length === 0,
        errors
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          message: 'Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
          severity: 'error'
        }]
      }
    }
  }

  private validateBasicSyntax(code: string): ValidationResult {
    const errors: ValidationError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for common syntax errors
      if (this.hasUnmatchedQuotes(line)) {
        errors.push({
          line: lineNumber,
          message: 'Unmatched quotes',
          severity: 'error'
        })
      }

      if (this.hasUnmatchedParentheses(line)) {
        errors.push({
          line: lineNumber,
          message: 'Unmatched parentheses',
          severity: 'warning'
        })
      }

      if (this.hasTrailingWhitespace(line)) {
        errors.push({
          line: lineNumber,
          message: 'Trailing whitespace',
          severity: 'warning'
        })
      }

      // Check for Python keywords used incorrectly
      if (this.hasInvalidKeywordUsage(line)) {
        errors.push({
          line: lineNumber,
          message: 'Invalid keyword usage',
          severity: 'error'
        })
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    }
  }

  private validateImports(code: string): ValidationResult {
    const errors: ValidationError[] = []
    const lines = code.split('\n')
    const importedModules = new Set<string>()
    // First pass: collect imports
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (line.startsWith('from ')) {
        const match = line.match(/from\s+(\w+)/)
        if (match) {
          importedModules.add(match[1])
        }
      } else if (line.startsWith('import ')) {
        const modules = line.replace('import ', '').split(',')
        modules.forEach(mod => importedModules.add(mod.trim()))
      }
    }

    // Second pass: check usage
    const codeContent = code.toLowerCase()
    for (const module of importedModules) {
      if (!codeContent.includes(module.toLowerCase())) {
        errors.push({
          message: `Unused import: ${module}`,
          severity: 'warning'
        })
      }
    }

    // Check for missing imports
    const requiredImports = this.getRequiredImports(code)
    for (const required of requiredImports) {
      if (!importedModules.has(required)) {
        errors.push({
          message: `Missing import: ${required}`,
          severity: 'error'
        })
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    }
  }

  private validateClassDefinitions(code: string): ValidationResult {
    const errors: ValidationError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lineNumber = i + 1

      if (line.startsWith('class ')) {
        // Validate class name (PascalCase)
        const classMatch = line.match(/class\s+(\w+)/)
        if (classMatch) {
          const className = classMatch[1]
          if (!this.isPascalCase(className)) {
            errors.push({
              line: lineNumber,
              message: `Class name '${className}' should be PascalCase`,
              severity: 'warning'
            })
          }
        }

        // Check if class has content
        let hasContent = false
        for (let j = i + 1; j < lines.length && lines[j].startsWith('    '); j++) {
          if (lines[j].trim()) {
            hasContent = true
            break
          }
        }

        if (!hasContent) {
          errors.push({
            line: lineNumber,
            message: 'Empty class definition',
            severity: 'warning'
          })
        }
      }
    }

    return {
      isValid: true,
      errors
    }
  }

  private validateIndentation(code: string): ValidationResult {
    const errors: ValidationError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      if (line.trim()) {
        // Check for consistent indentation (4 spaces)
        const leadingSpaces = line.match(/^(\s*)/)?.[1] || ''
        if (leadingSpaces.includes('\t')) {
          errors.push({
            line: lineNumber,
            message: 'Use spaces instead of tabs for indentation',
            severity: 'error'
          })
        } else if (leadingSpaces.length % 4 !== 0 && leadingSpaces.length > 0) {
          errors.push({
            line: lineNumber,
            message: 'Indentation should be multiples of 4 spaces',
            severity: 'warning'
          })
        }
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    }
  }

  private hasUnmatchedQuotes(line: string): boolean {
    const singleQuotes = (line.match(/'/g) || []).length
    const doubleQuotes = (line.match(/"/g) || []).length
    return (singleQuotes % 2 !== 0) || (doubleQuotes % 2 !== 0)
  }

  private hasUnmatchedParentheses(line: string): boolean {
    const openParens = (line.match(/\(/g) || []).length
    const closeParens = (line.match(/\)/g) || []).length
    return openParens !== closeParens
  }

  private hasTrailingWhitespace(line: string): boolean {
    return /\s+$/.test(line)
  }

  private hasInvalidKeywordUsage(line: string): boolean {
    // Basic check for Python keywords used as variable names
    const pythonKeywords = ['class', 'def', 'if', 'else', 'for', 'while', 'import', 'from']
    const words = line.split(/\s+/)
    
    return words.some(word => 
      pythonKeywords.includes(word) && 
      !line.includes(`${word} `) && 
      !line.includes(`${word}(`)
    )
  }

  private getRequiredImports(code: string): string[] {
    const required: string[] = []

    if (code.includes('BaseModel') && !code.includes('from pydantic import')) {
      required.push('pydantic')
    }

    if (code.includes('datetime') && !code.includes('from datetime import')) {
      required.push('datetime')
    }

    if (code.includes('Optional') && !code.includes('from typing import')) {
      required.push('typing')
    }

    if (code.includes('UUID') && !code.includes('from uuid import')) {
      required.push('uuid')
    }

    return required
  }

  private isPascalCase(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name)
  }

  // Safe AST-based validation without code execution
  async validateWithAST(code: string): Promise<ValidationResult> {
    // Parse Python code structure without executing it
    // This implementation uses pattern matching and AST-like analysis
    // Never uses exec() or eval() for security
    
    const errors: ValidationError[] = []
    
    try {
      // Parse class structure
      const classPattern = /class\s+(\w+)(?:\(([^)]*)\))?\s*:/g
      const functionPattern = /def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/g
      
      // Build AST-like structure
      const ast = {
        classes: [] as Array<{
          name: string;
          bases: string[];
          line: number;
        }>,
        functions: [] as Array<{
          name: string;
          params: string[];
          returnType: string | null;
          line: number;
        }>,
        imports: [] as Array<unknown>
      }
      
      // Extract classes safely
      let match
      while ((match = classPattern.exec(code)) !== null) {
        ast.classes.push({
          name: match[1],
          bases: match[2] ? match[2].split(',').map(s => s.trim()) : [],
          line: code.substring(0, match.index).split('\n').length
        })
      }
      
      // Extract functions safely
      while ((match = functionPattern.exec(code)) !== null) {
        ast.functions.push({
          name: match[1],
          params: match[2] ? match[2].split(',').map(s => s.trim()) : [],
          returnType: match[3] ? match[3].trim() : null,
          line: code.substring(0, match.index).split('\n').length
        })
      }
      
      // Validate structure
      for (const cls of ast.classes) {
        if (!cls.bases.includes('BaseModel') && cls.bases.length === 0) {
          errors.push({
            line: cls.line,
            message: `Class ${cls.name} should inherit from BaseModel`,
            severity: 'warning'
          })
        }
      }
      
      // Additional AST-based checks
      const astValidation = this.performASTValidation(code)
      errors.push(...astValidation.errors)
      
      return {
        isValid: errors.filter(e => e.severity === 'error').length === 0,
        errors
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          message: 'AST validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
          severity: 'error'
        }]
      }
    }
  }
  
  private performASTValidation(code: string): ValidationResult {
    const errors: ValidationError[] = []
    
    // Check for balanced brackets and braces
    const brackets = { '(': 0, '[': 0, '{': 0 }
    const closeBrackets: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i]
      if (char in brackets) {
        brackets[char as keyof typeof brackets]++
      } else if (char in closeBrackets) {
        const openBracket = closeBrackets[char] as keyof typeof brackets
        brackets[openBracket]--
        if (brackets[openBracket] < 0) {
          errors.push({
            message: `Unmatched ${char} bracket`,
            severity: 'error'
          })
        }
      }
    }
    
    // Check for unclosed brackets
    for (const [bracket, count] of Object.entries(brackets)) {
      if (count !== 0) {
        errors.push({
          message: `Unclosed ${bracket} bracket`,
          severity: 'error'
        })
      }
    }
    
    // Validate Python syntax patterns
    const invalidPatterns = [
      { pattern: /\bexec\s*\(/, message: 'exec() is not allowed for security reasons' },
      { pattern: /\beval\s*\(/, message: 'eval() is not allowed for security reasons' },
      { pattern: /\b__import__\s*\(/, message: '__import__() is not allowed for security reasons' },
      { pattern: /\bcompile\s*\(/, message: 'compile() is not allowed for security reasons' }
    ]
    
    for (const { pattern, message } of invalidPatterns) {
      if (pattern.test(code)) {
        errors.push({
          message,
          severity: 'error'
        })
      }
    }
    
    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    }
  }
}
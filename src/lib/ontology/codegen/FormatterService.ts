
export class FormatterService {
  async format(code: string): Promise<string> {
    try {
      // Basic Python formatting
      return this.basicFormat(code)
    } catch (error) {
      // If formatting fails, return original code
      console.warn('Code formatting failed:', error)
      return code
    }
  }

  private basicFormat(code: string): string {
    // Split into lines for processing
    const lines = code.split('\n')
    const formatted: string[] = []
    let inClass = false
    let inFunction = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Skip empty lines at the beginning
      if (!line && formatted.length === 0) continue

      // Handle class/function definitions
      if (line.startsWith('class ')) {
        if (formatted.length > 0 && formatted[formatted.length - 1].trim()) {
          formatted.push('') // Add blank line before class
        }
        inClass = true
        formatted.push(line)
        indentLevel = 1
        continue
      }

      if (line.startsWith('def ')) {
        if (inClass && formatted.length > 0 && !formatted[formatted.length - 1].startsWith('    ')) {
          formatted.push('') // Add blank line before method
        }
        inFunction = true
        formatted.push('    ' + line) // Methods are indented
        continue
      }

      // Handle docstrings
      if (line.startsWith('"""') && !line.endsWith('"""')) {
        formatted.push('    ' + line)
        // Continue until closing docstring
        i++
        while (i < lines.length && !lines[i].trim().endsWith('"""')) {
          formatted.push('    ' + lines[i].trim())
          i++
        }
        if (i < lines.length) {
          formatted.push('    ' + lines[i].trim())
        }
        continue
      }

      // Handle single-line docstrings
      if (line.startsWith('"""') && line.endsWith('"""')) {
        formatted.push('    ' + line)
        continue
      }

      // Handle imports
      if (line.startsWith('from ') || line.startsWith('import ')) {
        formatted.push(line)
        continue
      }

      // Handle comments
      if (line.startsWith('#')) {
        if (inClass || inFunction) {
          formatted.push('    ' + line)
        } else {
          formatted.push(line)
        }
        continue
      }

      // Handle regular code lines
      if (inClass && line && !line.startsWith('    ')) {
        formatted.push('    ' + line)
      } else {
        formatted.push(line)
      }

      // Reset flags
      if (!line && inFunction) {
        inFunction = false
      }
    }

    return this.cleanupFormatting(formatted.join('\n'))
  }

  private cleanupFormatting(code: string): string {
    // Remove multiple consecutive blank lines
    return code
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s*\n+/, '') // Remove blank lines at start
      .replace(/\n+$/, '\n') // Ensure single newline at end
  }

  formatPythonDict(obj: any, indent: number = 0): string {
    const spaces = '    '.repeat(indent)
    
    if (Array.isArray(obj)) {
      const items = obj.map(item => {
        if (typeof item === 'string') {
          return `"${item}"`
        }
        return String(item)
      })
      return `[${items.join(', ')}]`
    }

    if (typeof obj === 'object' && obj !== null) {
      const entries = Object.entries(obj).map(([key, value]) => {
        const formattedValue = this.formatValue(value, indent + 1)
        return `${spaces}    "${key}": ${formattedValue}`
      })
      
      return `{\n${entries.join(',\n')}\n${spaces}}`
    }

    return this.formatValue(obj, indent)
  }

  private formatValue(value: any, indent: number): string {
    if (typeof value === 'string') {
      return `"${value}"`
    }
    if (typeof value === 'boolean') {
      return value ? 'True' : 'False'
    }
    if (value === null || value === undefined) {
      return 'None'
    }
    if (Array.isArray(value)) {
      return this.formatPythonDict(value, indent)
    }
    if (typeof value === 'object') {
      return this.formatPythonDict(value, indent)
    }
    return String(value)
  }

  sortImports(code: string): string {
    const lines = code.split('\n')
    const stdlibImports: string[] = []
    const thirdPartyImports: string[] = []
    const otherLines: string[] = []
    let inImports = true

    for (const line of lines) {
      if (line.startsWith('from ') || line.startsWith('import ')) {
        if (inImports) {
          if (this.isStandardLibrary(line)) {
            stdlibImports.push(line)
          } else {
            thirdPartyImports.push(line)
          }
        } else {
          otherLines.push(line)
        }
      } else if (line.trim() === '' && inImports) {
        // Keep blank lines in imports section
        continue
      } else {
        inImports = false
        otherLines.push(line)
      }
    }

    const sortedImports = [
      ...stdlibImports.sort(),
      ...(stdlibImports.length > 0 && thirdPartyImports.length > 0 ? [''] : []),
      ...thirdPartyImports.sort()
    ]

    return [
      ...sortedImports,
      ...(sortedImports.length > 0 ? ['', ''] : []),
      ...otherLines
    ].join('\n')
  }

  private isStandardLibrary(importLine: string): boolean {
    const stdlibModules = [
      'datetime', 'typing', 'json', 'uuid', 'enum', 'decimal',
      'collections', 're', 'math', 'os', 'sys', 'pathlib'
    ]

    return stdlibModules.some(module => 
      importLine.includes(`from ${module}`) || 
      importLine.includes(`import ${module}`)
    )
  }
}
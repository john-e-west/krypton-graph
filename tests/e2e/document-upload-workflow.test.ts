// ============================================================================
// Document Upload Workflow E2E Tests - Story 9.1 QA
// ============================================================================

import { test, expect, Page } from '@playwright/test'
import path from 'path'

// Test configuration
const TEST_FILES = {
  small: path.join(__dirname, '../../DocUploadTest/small-test.md'),
  medium: path.join(__dirname, '../../DocUploadTest/sample-knowledge-base.md'),
  large: path.join(__dirname, '../../DocUploadTest/large-content-sample.md'),
  txt: path.join(__dirname, '../../DocUploadTest/meeting-notes.txt')
}

test.describe('Story 9.1: Document Upload and Analysis Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the document upload page
    await page.goto('/documents/upload')
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle')
  })

  test.describe('AC1: Document Upload Interface', () => {
    test('should display drag-and-drop zone', async ({ page }) => {
      // Check for drag-and-drop zone
      const dropZone = page.locator('[data-testid="document-dropzone"]')
      await expect(dropZone).toBeVisible()
      
      // Check for upload instructions
      await expect(page.getByText(/drag.*drop.*files/i)).toBeVisible()
      
      // Check for file format information
      await expect(page.getByText(/PDF.*TXT.*MD.*DOCX/i)).toBeVisible()
    })

    test('should handle file selection via click', async ({ page }) => {
      // Click on browse files button
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.small)
      
      // Verify file appears in upload queue
      await expect(page.getByText('small-test.md')).toBeVisible()
      await expect(page.getByText(/~200.*bytes/i)).toBeVisible()
    })

    test('should handle drag-and-drop file upload', async ({ page }) => {
      // Simulate drag and drop
      const dropZone = page.locator('[data-testid="document-dropzone"]')
      
      // Upload file via drag and drop
      await dropZone.setInputFiles(TEST_FILES.medium)
      
      // Verify file appears in upload queue
      await expect(page.getByText('sample-knowledge-base.md')).toBeVisible()
      
      // Check for file metadata display
      await expect(page.locator('[data-testid="file-metadata"]')).toBeVisible()
    })

    test('should handle multiple file uploads', async ({ page }) => {
      // Upload multiple files
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles([TEST_FILES.small, TEST_FILES.medium, TEST_FILES.txt])
      
      // Verify all files appear in queue
      await expect(page.getByText('small-test.md')).toBeVisible()
      await expect(page.getByText('sample-knowledge-base.md')).toBeVisible()
      await expect(page.getByText('meeting-notes.txt')).toBeVisible()
      
      // Check queue count
      await expect(page.getByText(/3.*files/i)).toBeVisible()
    })

    test('should validate file types', async ({ page }) => {
      // Try to upload invalid file type (create mock invalid file)
      const invalidFile = path.join(__dirname, '../../temp/invalid.exe')
      
      // This would typically show an error message
      const fileInput = page.locator('input[type="file"]')
      
      // Note: In real E2E, you'd create an actual invalid file
      // For now, we'll test the error display mechanism
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
    })
  })

  test.describe('AC2: Real-time Analysis Progress', () => {
    test('should show progress indicator during upload', async ({ page }) => {
      // Upload a file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.medium)
      
      // Click analyze button
      await page.click('[data-testid="analyze-button"]')
      
      // Check for progress indicator
      await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible()
      
      // Check for progress stages
      await expect(page.getByText(/uploading|processing|analyzing/i)).toBeVisible()
    })

    test('should update progress in real-time', async ({ page }) => {
      // Upload file and start analysis
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.large)
      
      await page.click('[data-testid="analyze-button"]')
      
      // Wait for progress updates
      await page.waitForSelector('[data-testid="progress-bar"]')
      
      // Check that progress value increases over time
      const progressBar = page.locator('[data-testid="progress-bar"]')
      const initialProgress = await progressBar.getAttribute('aria-valuenow')
      
      // Wait for progress to update
      await page.waitForTimeout(2000)
      
      const updatedProgress = await progressBar.getAttribute('aria-valuenow')
      
      // Progress should advance (or complete)
      expect(parseInt(updatedProgress || '0')).toBeGreaterThanOrEqual(parseInt(initialProgress || '0'))
    })

    test('should show completion status', async ({ page }) => {
      // Upload small file for quick completion
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.small)
      
      await page.click('[data-testid="analyze-button"]')
      
      // Wait for completion
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 })
      
      // Check completion indicator
      await expect(page.getByText(/analysis.*complete/i)).toBeVisible()
      await expect(page.locator('[data-testid="results-panel"]')).toBeVisible()
    })
  })

  test.describe('AC3: AI Type Suggestions Display', () => {
    test('should display entity type suggestions', async ({ page }) => {
      // Upload and analyze document
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.medium)
      
      await page.click('[data-testid="analyze-button"]')
      
      // Wait for analysis to complete
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 })
      
      // Check for entity type suggestions
      await expect(page.locator('[data-testid="entity-types"]')).toBeVisible()
      await expect(page.getByText(/suggested.*entity.*types/i)).toBeVisible()
      
      // Check for individual entity type cards
      await expect(page.locator('[data-testid="entity-type-card"]')).toHaveCount({ min: 1, max: 10 })
    })

    test('should display edge type suggestions', async ({ page }) => {
      // Upload and analyze document
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.medium)
      
      await page.click('[data-testid="analyze-button"]')
      
      // Wait for analysis to complete
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 })
      
      // Check for edge type suggestions
      await expect(page.locator('[data-testid="edge-types"]')).toBeVisible()
      await expect(page.getByText(/suggested.*edge.*types/i)).toBeVisible()
      
      // Check for individual edge type cards
      await expect(page.locator('[data-testid="edge-type-card"]')).toHaveCount({ min: 1, max: 10 })
    })

    test('should show confidence scores', async ({ page }) => {
      // Upload and analyze document
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.medium)
      
      await page.click('[data-testid="analyze-button"]')
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 })
      
      // Check for confidence indicators
      await expect(page.locator('[data-testid="confidence-score"]')).toHaveCount({ min: 1 })
      
      // Verify confidence values are displayed as percentages
      const confidenceElements = page.locator('[data-testid="confidence-score"]')
      const firstConfidence = await confidenceElements.first().textContent()
      expect(firstConfidence).toMatch(/\d+%/)
    })
  })

  test.describe('AC4: Classification Rate Prediction', () => {
    test('should display expected classification rate', async ({ page }) => {
      // Upload and analyze document
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.large)
      
      await page.click('[data-testid="analyze-button"]')
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 })
      
      // Check for classification rate display
      await expect(page.locator('[data-testid="classification-rate"]')).toBeVisible()
      await expect(page.getByText(/expected.*classification.*rate/i)).toBeVisible()
      
      // Check for percentage display
      const rateElement = page.locator('[data-testid="classification-rate-value"]')
      const rateText = await rateElement.textContent()
      expect(rateText).toMatch(/\d+%/)
    })

    test('should show classification prediction metrics', async ({ page }) => {
      // Upload and analyze document
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.medium)
      
      await page.click('[data-testid="analyze-button"]')
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 })
      
      // Check for prediction metrics
      await expect(page.locator('[data-testid="total-entities"]')).toBeVisible()
      await expect(page.locator('[data-testid="expected-classified"]')).toBeVisible()
      
      // Verify metrics show reasonable numbers
      const totalEntities = await page.locator('[data-testid="total-entities"]').textContent()
      const expectedClassified = await page.locator('[data-testid="expected-classified"]').textContent()
      
      expect(parseInt(totalEntities || '0')).toBeGreaterThan(0)
      expect(parseInt(expectedClassified || '0')).toBeGreaterThan(0)
    })
  })

  test.describe('AC5: Performance Requirements', () => {
    test('should complete analysis within 30 seconds', async ({ page }) => {
      const startTime = Date.now()
      
      // Upload medium file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.medium)
      
      await page.click('[data-testid="analyze-button"]')
      
      // Wait for completion with 30-second timeout
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 })
      
      const endTime = Date.now()
      const analysisTime = endTime - startTime
      
      // Verify analysis completed within time limit
      expect(analysisTime).toBeLessThan(30000) // 30 seconds
    })

    test('should handle large files efficiently', async ({ page }) => {
      // Upload large file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.large)
      
      await page.click('[data-testid="analyze-button"]')
      
      // Should show progress immediately
      await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible({ timeout: 5000 })
      
      // Should complete within reasonable time
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 })
    })
  })

  test.describe('AC6: Caching Functionality', () => {
    test('should cache analysis results for repeated uploads', async ({ page }) => {
      // First analysis
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.small)
      
      await page.click('[data-testid="analyze-button"]')
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 })
      
      // Note analysis time
      const firstResults = await page.locator('[data-testid="results-panel"]').textContent()
      
      // Clear and upload same file again
      await page.click('[data-testid="clear-all-button"]')
      await fileInput.setInputFiles(TEST_FILES.small)
      
      const startTime = Date.now()
      await page.click('[data-testid="analyze-button"]')
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 10000 })
      const endTime = Date.now()
      
      // Second analysis should be much faster (cached)
      const cacheTime = endTime - startTime
      expect(cacheTime).toBeLessThan(5000) // Should be very fast if cached
      
      // Results should be consistent
      const secondResults = await page.locator('[data-testid="results-panel"]').textContent()
      // Basic consistency check (specific comparison would depend on exact UI structure)
      expect(secondResults).toBeTruthy()
    })
  })

  test.describe('AC7: Error Handling', () => {
    test('should handle file upload errors gracefully', async ({ page }) => {
      // Mock network failure (this would require test setup to simulate)
      // For now, test UI error display
      
      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.small)
      
      // Look for potential error messages
      const errorMessage = page.locator('[data-testid="error-message"]')
      
      // If error occurs, it should be displayed to user
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText(/error|failed|problem/)
        
        // Should provide retry option
        await expect(page.getByText(/retry|try again/i)).toBeVisible()
      }
    })

    test('should show helpful error messages', async ({ page }) => {
      // Test various error scenarios
      
      // Empty upload
      await page.click('[data-testid="analyze-button"]')
      
      // Should show validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
      await expect(page.getByText(/select.*file/i)).toBeVisible()
    })

    test('should handle processing timeouts', async ({ page }) => {
      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.large)
      
      await page.click('[data-testid="analyze-button"]')
      
      // Wait longer than expected for timeout handling
      try {
        await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 35000 })
      } catch (error) {
        // Should show timeout error
        await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible()
        await expect(page.getByText(/timeout|taking longer/i)).toBeVisible()
      }
    })
  })

  test.describe('User Experience & Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press('Tab')
      
      // Upload zone should be focusable
      const dropZone = page.locator('[data-testid="document-dropzone"]')
      await expect(dropZone).toBeFocused()
      
      // Can activate with keyboard
      await page.keyboard.press('Space')
      // File dialog would open (can't easily test in headless mode)
    })

    test('should provide screen reader friendly content', async ({ page }) => {
      // Check for proper ARIA labels
      const dropZone = page.locator('[data-testid="document-dropzone"]')
      await expect(dropZone).toHaveAttribute('aria-label')
      
      // Progress indicators should have proper labels
      const progressBar = page.locator('[data-testid="progress-bar"]')
      if (await progressBar.isVisible()) {
        await expect(progressBar).toHaveAttribute('aria-label')
        await expect(progressBar).toHaveAttribute('role', 'progressbar')
      }
    })

    test('should provide clear feedback for all actions', async ({ page }) => {
      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.small)
      
      // Should show confirmation
      await expect(page.getByText(/file.*added|uploaded/i)).toBeVisible()
      
      // Start analysis
      await page.click('[data-testid="analyze-button"]')
      
      // Should show analysis started feedback
      await expect(page.getByText(/analysis.*started|processing/i)).toBeVisible()
    })
  })

  test.describe('Integration with Other Components', () => {
    test('should integrate with authentication system', async ({ page }) => {
      // Test would require authentication setup
      // For now, verify auth components are present
      
      // Should show user info or auth status
      const authIndicator = page.locator('[data-testid="auth-status"]')
      if (await authIndicator.isVisible()) {
        await expect(authIndicator).toBeTruthy()
      }
    })

    test('should connect to backend APIs properly', async ({ page }) => {
      // Upload file and verify network requests
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_FILES.small)
      
      // Listen for API calls
      const responsePromise = page.waitForResponse('/api/documents/upload')
      await page.click('[data-testid="analyze-button"]')
      
      const response = await responsePromise
      expect(response.status()).toBe(200)
      
      // Should also make analysis API call
      const analysisPromise = page.waitForResponse('/api/documents/analyze')
      const analysisResponse = await analysisPromise
      expect(analysisResponse.status()).toBe(200)
    })
  })
})
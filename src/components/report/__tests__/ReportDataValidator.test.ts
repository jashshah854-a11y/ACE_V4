import { describe, it, expect } from 'vitest';
import { validateReportData } from '../ReportDataValidator';
import type { ReportDataResult } from '@/hooks/useReportData';

// Helper to create a minimal valid report data object
function createValidReportData(overrides: Partial<ReportDataResult> = {}): ReportDataResult {
  return {
    metrics: { someMetric: 100 },
    personas: [{ name: 'Test Persona', description: 'A test persona' }],
    executiveBrief: { 
      keyFindings: ['Finding 1', 'Finding 2'],
      summary: 'Test summary'
    },
    heroInsight: { 
      keyInsight: 'Test insight',
      description: 'Test description'
    },
    governanceWarnings: [],
    guidanceNotes: [],
    confidenceValue: 85,
    dataQualityValue: 80,
    sections: [{ title: 'Section 1', content: 'Content' }],
    safeMode: false,
    anomalies: { count: 2, items: [] },
    ...overrides,
  } as ReportDataResult;
}

describe('validateReportData', () => {
  describe('content validation', () => {
    it('should return error when content is empty', () => {
      const data = createValidReportData();
      const result = validateReportData(data, '');
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'content',
          severity: 'error',
          message: 'Report content is empty',
        })
      );
    });

    it('should return error when content is only whitespace', () => {
      const data = createValidReportData();
      const result = validateReportData(data, '   \n\t  ');
      
      expect(result.isValid).toBe(false);
      expect(result.issues.find(i => i.field === 'content')?.severity).toBe('error');
    });

    it('should return error when content is null/undefined', () => {
      const data = createValidReportData();
      const result = validateReportData(data, null as unknown as string);
      
      expect(result.isValid).toBe(false);
    });

    it('should pass when content has valid text', () => {
      const data = createValidReportData();
      const result = validateReportData(data, 'Valid report content');
      
      expect(result.issues.find(i => i.field === 'content')).toBeUndefined();
    });
  });

  describe('metrics validation', () => {
    it('should warn when metrics are missing', () => {
      const data = createValidReportData({ metrics: undefined });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'metrics',
          severity: 'warning',
        })
      );
    });

    it('should warn when metrics object is empty', () => {
      const data = createValidReportData({ metrics: {} });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'metrics')?.severity).toBe('warning');
    });

    it('should pass when metrics exist', () => {
      const data = createValidReportData({ metrics: { revenue: 1000 } });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'metrics')).toBeUndefined();
    });
  });

  describe('personas validation', () => {
    it('should show info when personas are missing', () => {
      const data = createValidReportData({ personas: undefined });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'personas',
          severity: 'info',
        })
      );
    });

    it('should show info when personas array is empty', () => {
      const data = createValidReportData({ personas: [] });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'personas')?.severity).toBe('info');
    });

    it('should pass when personas exist', () => {
      const data = createValidReportData({ 
        personas: [{ name: 'Persona 1', description: 'Desc' }] 
      });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'personas')).toBeUndefined();
    });
  });

  describe('executive brief validation', () => {
    it('should warn when executiveBrief is missing', () => {
      const data = createValidReportData({ executiveBrief: undefined });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'executiveBrief',
          severity: 'warning',
        })
      );
    });

    it('should warn when keyFindings are empty', () => {
      const data = createValidReportData({ 
        executiveBrief: { keyFindings: [], summary: 'Summary' } 
      });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'executiveBrief')?.severity).toBe('warning');
    });

    it('should pass when executiveBrief has findings', () => {
      const data = createValidReportData({ 
        executiveBrief: { keyFindings: ['Finding'], summary: 'Summary' } 
      });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'executiveBrief')).toBeUndefined();
    });
  });

  describe('hero insight validation', () => {
    it('should show info when heroInsight is missing', () => {
      const data = createValidReportData({ heroInsight: undefined });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'heroInsight',
          severity: 'info',
        })
      );
    });

    it('should show info when keyInsight is missing', () => {
      const data = createValidReportData({ 
        heroInsight: { keyInsight: '', description: 'Desc' } 
      });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'heroInsight')?.severity).toBe('info');
    });
  });

  describe('confidence value validation', () => {
    it('should warn when confidence is undefined', () => {
      const data = createValidReportData({ confidenceValue: undefined });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'confidence',
          severity: 'warning',
          message: 'Confidence score not calculated',
        })
      );
    });

    it('should show info when confidence is low (below 40)', () => {
      const data = createValidReportData({ confidenceValue: 30 });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'confidence',
          severity: 'info',
          message: 'Low confidence score (30%)',
        })
      );
    });

    it('should pass when confidence is 40 or above', () => {
      const data = createValidReportData({ confidenceValue: 40 });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'confidence')).toBeUndefined();
    });

    it('should pass when confidence is high', () => {
      const data = createValidReportData({ confidenceValue: 95 });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'confidence')).toBeUndefined();
    });
  });

  describe('data quality validation', () => {
    it('should warn when dataQuality is undefined', () => {
      const data = createValidReportData({ dataQualityValue: undefined });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'dataQuality',
          severity: 'warning',
        })
      );
    });

    it('should show info when dataQuality is low (below 50)', () => {
      const data = createValidReportData({ dataQualityValue: 40 });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'dataQuality',
          severity: 'info',
        })
      );
    });

    it('should pass when dataQuality is 50 or above', () => {
      const data = createValidReportData({ dataQualityValue: 50 });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'dataQuality')).toBeUndefined();
    });
  });

  describe('sections validation', () => {
    it('should warn when sections are missing', () => {
      const data = createValidReportData({ sections: undefined });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'sections',
          severity: 'warning',
        })
      );
    });

    it('should warn when sections array is empty', () => {
      const data = createValidReportData({ sections: [] });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'sections')?.severity).toBe('warning');
    });
  });

  describe('safe mode validation', () => {
    it('should show info when safeMode is true', () => {
      const data = createValidReportData({ safeMode: true });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'safeMode',
          severity: 'info',
        })
      );
    });

    it('should not show info when safeMode is false', () => {
      const data = createValidReportData({ safeMode: false });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'safeMode')).toBeUndefined();
    });
  });

  describe('anomalies validation', () => {
    it('should warn when anomaly count is high (>10)', () => {
      const data = createValidReportData({ anomalies: { count: 15, items: [] } });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'anomalies',
          severity: 'warning',
          message: 'High number of anomalies detected (15)',
        })
      );
    });

    it('should pass when anomaly count is 10 or less', () => {
      const data = createValidReportData({ anomalies: { count: 10, items: [] } });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'anomalies')).toBeUndefined();
    });

    it('should handle missing anomalies gracefully', () => {
      const data = createValidReportData({ anomalies: undefined });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.issues.find(i => i.field === 'anomalies')).toBeUndefined();
    });
  });

  describe('validation score calculation', () => {
    it('should return score of 100 for fully valid data', () => {
      const data = createValidReportData();
      const result = validateReportData(data, 'Valid content');
      
      expect(result.score).toBe(100);
      expect(result.isValid).toBe(true);
    });

    it('should reduce score by 30 for each error', () => {
      const data = createValidReportData();
      const result = validateReportData(data, ''); // Empty content = error
      
      expect(result.score).toBe(70); // 100 - 30
      expect(result.isValid).toBe(false);
    });

    it('should reduce score by 10 for each warning', () => {
      const data = createValidReportData({ 
        metrics: undefined,
        sections: undefined,
      });
      const result = validateReportData(data, 'Valid content');
      
      // 2 warnings = -20 points
      expect(result.score).toBe(80);
      expect(result.isValid).toBe(true);
    });

    it('should reduce score by 2 for each info', () => {
      const data = createValidReportData({ 
        personas: [],
        heroInsight: undefined,
      });
      const result = validateReportData(data, 'Valid content');
      
      // 2 info = -4 points
      expect(result.score).toBe(96);
      expect(result.isValid).toBe(true);
    });

    it('should never return negative score', () => {
      const data = createValidReportData({ 
        metrics: undefined,
        executiveBrief: undefined,
        sections: undefined,
        confidenceValue: undefined,
        dataQualityValue: undefined,
        anomalies: { count: 20, items: [] },
      });
      const result = validateReportData(data, ''); // Add error too
      
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should correctly count summary totals', () => {
      const data = createValidReportData({ 
        metrics: undefined, // warning
        personas: [], // info
        executiveBrief: undefined, // warning
        heroInsight: undefined, // info
        safeMode: true, // info
      });
      const result = validateReportData(data, ''); // error
      
      expect(result.summary.errors).toBe(1);
      expect(result.summary.warnings).toBe(2);
      expect(result.summary.info).toBe(3);
    });
  });

  describe('isValid determination', () => {
    it('should be valid when there are no errors', () => {
      const data = createValidReportData({ 
        metrics: undefined, // warning only
      });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.isValid).toBe(true);
    });

    it('should be invalid when there is at least one error', () => {
      const data = createValidReportData();
      const result = validateReportData(data, ''); // error
      
      expect(result.isValid).toBe(false);
    });

    it('should remain valid with only warnings and info', () => {
      const data = createValidReportData({ 
        metrics: undefined,
        personas: [],
        sections: undefined,
      });
      const result = validateReportData(data, 'Valid content');
      
      expect(result.isValid).toBe(true);
      expect(result.summary.warnings).toBeGreaterThan(0);
      expect(result.summary.info).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle completely empty data object', () => {
      const data = {} as ReportDataResult;
      const result = validateReportData(data, 'Valid content');
      
      expect(result).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle null data', () => {
      const result = validateReportData(null as unknown as ReportDataResult, 'Valid content');
      
      expect(result).toBeDefined();
    });

    it('should handle undefined data', () => {
      const result = validateReportData(undefined as unknown as ReportDataResult, 'Valid content');
      
      expect(result).toBeDefined();
    });

    it('should provide suggestions for all issues', () => {
      const data = createValidReportData({ 
        metrics: undefined,
        personas: [],
      });
      const result = validateReportData(data, '');
      
      result.issues.forEach(issue => {
        expect(issue.suggestion).toBeDefined();
        expect(issue.suggestion.length).toBeGreaterThan(0);
      });
    });
  });
});

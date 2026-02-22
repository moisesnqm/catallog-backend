/**
 * Unit tests for sector schemas and default.
 */

import { describe, it, expect } from 'vitest';
import {
  sectorAccessSchema,
  catalogSectorSchema,
  SECTOR_ACCESS_DEFAULT,
  SECTOR_VALUES,
  SECTOR_ACCESS_VALUES,
} from './sector.js';

describe('sector schema', () => {
  it('SECTOR_ACCESS_DEFAULT is "all"', () => {
    expect(SECTOR_ACCESS_DEFAULT).toBe('all');
  });

  it('sectorAccessSchema accepts all, none, and concrete sectors', () => {
    expect(sectorAccessSchema.parse('all')).toBe('all');
    expect(sectorAccessSchema.parse('none')).toBe('none');
    for (const s of SECTOR_VALUES) {
      expect(sectorAccessSchema.parse(s)).toBe(s);
    }
  });

  it('sectorAccessSchema rejects invalid values', () => {
    expect(() => sectorAccessSchema.parse('invalid')).toThrow();
    expect(() => sectorAccessSchema.parse('')).toThrow();
  });

  it('catalogSectorSchema accepts concrete sectors and null', () => {
    expect(catalogSectorSchema.parse(null)).toBeNull();
    for (const s of SECTOR_VALUES) {
      expect(catalogSectorSchema.parse(s)).toBe(s);
    }
  });

  it('catalogSectorSchema rejects all and none', () => {
    expect(() => catalogSectorSchema.parse('all')).toThrow();
    expect(() => catalogSectorSchema.parse('none')).toThrow();
  });

  it('SECTOR_ACCESS_VALUES includes all and none', () => {
    expect(SECTOR_ACCESS_VALUES).toContain('all');
    expect(SECTOR_ACCESS_VALUES).toContain('none');
    expect(SECTOR_ACCESS_VALUES.length).toBe(SECTOR_VALUES.length + 2);
  });
});

import { describe, it, expect } from 'vitest';
import {
  sortIdsToFieldNames, sortFieldNamesToIds, reconcileSelection,
} from './filterReconcile';

const SORT_OPTS = [
  { id: 's1', field_name: 'extPick' },
  { id: 's2', field_name: 'faceValue' },
  { id: 's3', field_name: 'sultan' },
];

describe('sort mapping', () => {
  it('maps ids to field names, dropping unknown ids', () => {
    expect(sortIdsToFieldNames(['s2', 'sX', 's1'], SORT_OPTS)).toEqual(['faceValue', 'extPick']);
  });
  it('maps field names to ids, dropping unknown names', () => {
    expect(sortFieldNamesToIds(['faceValue', 'nope'], SORT_OPTS)).toEqual(['s2']);
  });
});

describe('reconcileSelection (spec §3prime)', () => {
  const valid = new Set(['a', 'b', 'c']);
  const all = ['a', 'b', 'c'];

  it('keeps the valid subset of a saved selection', () => {
    expect(reconcileSelection(['a', 'zzz', 'b'], valid, ['a'], all)).toEqual(['a', 'b']);
  });
  it('falls back to admin defaults (valid subset) when saved is fully orphaned', () => {
    expect(reconcileSelection(['x', 'y'], valid, ['b', 'q'], all)).toEqual(['b']);
  });
  it('falls back to admin defaults when saved is empty', () => {
    expect(reconcileSelection([], valid, ['c'], all)).toEqual(['c']);
  });
  it('falls back to ALL when saved orphaned and no admin defaults', () => {
    expect(reconcileSelection(['x'], valid, [], all)).toEqual(['a', 'b', 'c']);
  });
  it('falls back to ALL when admin defaults are also all-orphaned', () => {
    expect(reconcileSelection([], valid, ['zzz'], all)).toEqual(['a', 'b', 'c']);
  });
});

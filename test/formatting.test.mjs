import test from 'node:test';
import assert from 'node:assert/strict';

// Import the formatting functions from TS module directly
import { formatBoothLabel, formatWardLabel } from '../src/lib/formatting.ts';

test('Booth label normalization - prevents duplicate booth numbers', async (t) => {
  await t.test('handles booth name that already includes "Booth <num> - "', () => {
    // Exact scenario from QA campaign: Booth 1 with name "Booth 1 - Village 1"
    const label = formatBoothLabel(1, 'Booth 1 - Village 1');
    assert.equal(label, 'Booth 1 - Village 1');
  });

  await t.test('produces expected "Voters - Booth 1 - Village 1" page heading', () => {
    const boothLabel = formatBoothLabel(1, 'Booth 1 - Village 1');
    const heading = `Voters - ${boothLabel}`;
    assert.equal(heading, 'Voters - Booth 1 - Village 1');
  });

  await t.test('handles booth name without prefix: "Village 1"', () => {
    const label = formatBoothLabel(1, 'Village 1');
    assert.equal(label, 'Booth 1 - Village 1');
  });

  await t.test('handles booth name with "Booth #1: Village 1"', () => {
    const label = formatBoothLabel(1, 'Booth #1: Village 1');
    assert.equal(label, 'Booth 1 - Village 1');
  });

  await t.test('handles booth name with "Booth 1: Village 1"', () => {
    const label = formatBoothLabel(1, 'Booth 1: Village 1');
    assert.equal(label, 'Booth 1 - Village 1');
  });

  await t.test('handles booth name with only "Booth 1"', () => {
    const label = formatBoothLabel(1, 'Booth 1');
    assert.equal(label, 'Booth 1');
  });

  await t.test('handles empty or missing booth name', () => {
    assert.equal(formatBoothLabel(1, ''), 'Booth 1');
    assert.equal(formatBoothLabel(1, null), 'Booth 1');
    assert.equal(formatBoothLabel(1, undefined), 'Booth 1');
  });

  await t.test('handles Booth 2 with name "Booth 2 - Village 1"', () => {
    const label = formatBoothLabel(2, 'Booth 2 - Village 1');
    assert.equal(label, 'Booth 2 - Village 1');
    assert.equal(`Voters - ${label}`, 'Voters - Booth 2 - Village 1');
  });

  await t.test('handles mismatched prefix gracefully by extracting remainder', () => {
    const label = formatBoothLabel(2, 'Booth 1 - Village 1');
    assert.equal(label, 'Booth 2 - Village 1');
  });
});

test('Ward label normalization - prevents duplicate ward numbers', async (t) => {
  await t.test('handles ward name that already includes "Ward <num> - "', () => {
    const label = formatWardLabel(1, 'Ward 1 - Central');
    assert.equal(label, 'Ward 1 - Central');
  });

  await t.test('handles ward name without prefix: "Central"', () => {
    const label = formatWardLabel(1, 'Central');
    assert.equal(label, 'Ward 1 - Central');
  });

  await t.test('handles ward name with "Ward #1: Central"', () => {
    const label = formatWardLabel(1, 'Ward #1: Central');
    assert.equal(label, 'Ward 1 - Central');
  });

  await t.test('handles ward name with only "Ward 1"', () => {
    const label = formatWardLabel(1, 'Ward 1');
    assert.equal(label, 'Ward 1');
  });

  await t.test('handles empty or missing ward name', () => {
    assert.equal(formatWardLabel(1, ''), 'Ward 1');
    assert.equal(formatWardLabel(1, null), 'Ward 1');
    assert.equal(formatWardLabel(1, undefined), 'Ward 1');
  });
});

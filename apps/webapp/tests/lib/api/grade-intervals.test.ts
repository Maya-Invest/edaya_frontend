import { lookupGradeInterval, newGradeIntervals, roundedSample, splitGradeInterval, validateGradeIntervals, validGradeScalePrecision } from '$lib/api/grade-intervals'
import { describe, expect, test } from 'bun:test'

describe('editable grading intervals', () => {
  test('covers the entire scale and matches inclusive lower bounds and final maximum', () => {
    const ranges = newGradeIntervals()
    expect(validateGradeIntervals(ranges, 0, 20)).toBe(true)
    expect(lookupGradeInterval(ranges, 10)?.letter).toBe('C')
    expect(lookupGradeInterval(ranges, 20)?.letter).toBe('A')
    expect(lookupGradeInterval(ranges, 20.01)).toBeUndefined()
    expect(lookupGradeInterval(ranges, roundedSample(9.995, 2, 'nearest'))?.letter).toBe('C')
    expect(lookupGradeInterval(ranges, roundedSample(9.995, 2, 'truncate'))?.letter).toBe('D')
  })
  test('splits without changing unrelated intervals or losing the existing identifier', () => {
    const original = newGradeIntervals()
    const split = splitGradeInterval(original, original[0].id!)
    expect(split[0].id).toBe(original[0].id)
    expect(split[1].id).not.toBe(original[0].id)
    expect(split.slice(2)).toEqual(original.slice(1))
    expect(validateGradeIntervals(split, 0, 20)).toBe(true)
    expect(original[0].maxScore).toBe(10)
  })
  test('rejects gaps, overlaps, duplicate codes, and out-of-scale points', () => {
    for (const minScore of [9, 11]) {
      const ranges = newGradeIntervals(); ranges[1].minScore = minScore
      expect(validateGradeIntervals(ranges, 0, 20)).toBe(false)
    }
    const ranges = newGradeIntervals(); ranges[1].letter = ranges[0].letter
    expect(validateGradeIntervals(ranges, 0, 20)).toBe(false)
    ranges[1].letter = 'C'; ranges[1].gpaValue = 21
    expect(validateGradeIntervals(ranges, 0, 20)).toBe(false)
  })
})

test('scale precision must represent its bounds so every reported mark can match an interval', () => {
  expect(validGradeScalePrecision(0, 4.35, 1)).toBe(false)
  expect(validGradeScalePrecision(0, 4.35, 2)).toBe(true)
  expect(validGradeScalePrecision(0, 4.1, 1)).toBe(true)
  expect(validGradeScalePrecision(0, 20, 0)).toBe(true)
})

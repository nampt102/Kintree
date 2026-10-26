import { expect, test } from 'vitest'
import { windowClassOf } from './hooks.ts'

test.each([
  [319, 'compact'],
  [375, 'compact'],
  [599, 'compact'],
  [600, 'medium'],
  [839, 'medium'],
  [840, 'expanded'],
  [1440, 'expanded'],
])('bề rộng %i px là cỡ %s', (w, cls) => {
  expect(windowClassOf(w)).toBe(cls)
})

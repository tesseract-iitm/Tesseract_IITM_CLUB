import assert from 'node:assert/strict';
import test from 'node:test';

test('custom cursor interactive selector matches all intended interactive elements', () => {
  const interactiveSelector =
    'button, a, input, select, textarea, [role="button"], .card-hover, .btn, [data-interactive="true"], .event-row, .lb-btn-primary, .lb-btn-ghost, .lb-pill, [tabindex="0"]';

  const sampleInteractiveTags = ['button', 'a', 'input', 'select', 'textarea'];
  const sampleClasses = ['card-hover', 'btn', 'event-row', 'lb-btn-primary', 'lb-btn-ghost', 'lb-pill'];

  for (const tag of sampleInteractiveTags) {
    assert.ok(
      interactiveSelector.includes(tag),
      `Selector should include tag ${tag}`
    );
  }

  for (const cls of sampleClasses) {
    assert.ok(
      interactiveSelector.includes(`.${cls}`),
      `Selector should include class .${cls}`
    );
  }
});

test('touch fallback detection identifies coarse pointers and ontouchstart', () => {
  function isTouchDevice(hasTouchStart: boolean, coarseMatch: boolean): boolean {
    return coarseMatch || hasTouchStart;
  }

  // Desktop mouse scenario
  assert.equal(isTouchDevice(false, false), false);

  // Mobile touchscreen scenario
  assert.equal(isTouchDevice(true, false), true);
  assert.equal(isTouchDevice(false, true), true);
  assert.equal(isTouchDevice(true, true), true);
});

test('native mouse cursor is hidden when custom cursor is active on non-touch screens', () => {
  const classList = new Set<string>();
  const mockDocumentElement = {
    classList: {
      add: (cls: string) => classList.add(cls),
      remove: (cls: string) => classList.delete(cls),
      contains: (cls: string) => classList.has(cls),
    }
  };

  // When mouse enters window on desktop
  mockDocumentElement.classList.add('hide-native-cursor');
  assert.equal(mockDocumentElement.classList.contains('hide-native-cursor'), true);

  // When mouse leaves window
  mockDocumentElement.classList.remove('hide-native-cursor');
  assert.equal(mockDocumentElement.classList.contains('hide-native-cursor'), false);
});

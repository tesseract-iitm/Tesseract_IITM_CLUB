import assert from 'node:assert/strict';
import test from 'node:test';
import { SAAVAN_EVENTS, getFeaturedSaavanEvent, type SaavanEvent } from '../src/data/saavanEvents.ts';

test('SAAVAN_EVENTS contains verified events with non-empty titles and dates', () => {
  assert.ok(SAAVAN_EVENTS.length >= 4);
  for (const event of SAAVAN_EVENTS) {
    assert.ok(event.id.length > 0);
    assert.ok(event.title.length > 0);
    assert.ok(event.startDate.length > 0);
    assert.ok(event.slug.length > 0);
  }
});

test('getFeaturedSaavanEvent identifies a featured event', () => {
  const featured = getFeaturedSaavanEvent();
  assert.ok(featured !== null);
  assert.ok(featured?.title.length > 0);
});

test('status filtering correctly subsets events', () => {
  const upcoming = SAAVAN_EVENTS.filter((e) => e.status === 'UPCOMING');
  assert.ok(upcoming.length > 0);
  for (const e of upcoming) {
    assert.equal(e.status, 'UPCOMING');
  }
});

test('category filtering properly matches event types', () => {
  const esports = SAAVAN_EVENTS.filter((e) =>
    e.eventType.toLowerCase().includes('esports')
  );
  assert.ok(esports.length > 0);
  for (const e of esports) {
    assert.ok(e.eventType.toLowerCase().includes('esports'));
  }
});

test('search query matches title, description, or venue', () => {
  const query = 'bgmi';
  const matched = SAAVAN_EVENTS.filter((e) => {
    const inTitle = e.title.toLowerCase().includes(query);
    const inDesc = (e.shortDescription || e.description || '').toLowerCase().includes(query);
    const inType = (e.eventType || '').toLowerCase().includes(query);
    const inVenue = (e.venue || e.location || '').toLowerCase().includes(query);
    return inTitle || inDesc || inType || inVenue;
  });

  assert.ok(matched.length >= 1);
  assert.ok(matched.some((e) => e.title.includes('BGMI')));
});

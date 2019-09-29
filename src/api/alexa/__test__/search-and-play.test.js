// @flow

import { getEventAndFilter } from './utils';

describe('Search and Play', () => {
  test('play-comedy-mean-girls', () => {
    const { filter } = getEventAndFilter('play-comedy-mean-girls.json');
    expect(filter.titles).toEqual(['Mean Girls']);
    expect(filter.genres).toEqual(['Comedy', 'Comedy drama', 'Musical comedy', 'Romantic comedy']);
    ['collections', 'actors', 'roles'].forEach(key => (
      expect(filter[key]).toEqual([])
    ));
    ['mediaType', 'season', 'episode'].forEach(key => (
      expect(filter[key]).toBeNull()
    ));
  });

  test('play-comedy-with-tom-hanks', () => {
    const { filter } = getEventAndFilter('play-comedy-with-tom-hanks.json');

    expect(filter.genres).toEqual(['Comedy', 'Comedy drama', 'Musical comedy', 'Romantic comedy']);
    expect(filter.actors).toEqual(['Tom Hanks', 'Lloyd Hanks', 'Benjamin Hanks', 'Dannie Hanks', 'Megan Hanks']);
    ['titles', 'collections', 'roles'].forEach(key => (
      expect(filter[key]).toEqual([])
    ));
    ['mediaType', 'season', 'episode'].forEach(key => (
      expect(filter[key]).toBeNull()
    ));
  });

  test('play-darth-vader-movies', () => {
    const { filter } = getEventAndFilter('play-darth-vader-movies.json');

    expect(filter.roles).toEqual(['Darth Vader']);
    ['titles', 'collections', 'genres', 'actors'].forEach(key => (
      expect(filter[key]).toEqual([])
    ));
    expect(filter.mediaType).toBe('movie');
    ['season', 'episode'].forEach(key => (
      expect(filter[key]).toBeNull()
    ));
  });

  test('play-how-i-met-your-mother', () => {
    const { filter } = getEventAndFilter('play-how-i-met-your-mother.json');

    expect(filter.titles).toEqual(['How I Met Your Mother', 'Goodbye How I Met Your Mother', 'How I Met Your Mother: Extras', 'How I Met Your Puppet Mother']);
    ['collections', 'genres', 'actors', 'roles'].forEach(key => (
      expect(filter[key]).toEqual([])
    ));
    ['mediaType', 'season', 'episode'].forEach(key => (
      expect(filter[key]).toBeNull()
    ));
  });

  test('play-mean-girls-with-lindsay-lohan', () => {
    const { filter } = getEventAndFilter('play-mean-girls-with-lindsay-lohan.json');

    expect(filter.titles).toEqual(['Mean Girls']);
    expect(filter.actors).toEqual(['Lindsay Lohan', 'Ali Lohan', 'Horst Lohan', 'Dina Lohan', 'Treison Lohan']);
    ['collections', 'genres', 'roles'].forEach(key => (
      expect(filter[key]).toEqual([])
    ));
    ['mediaType', 'season', 'episode'].forEach(key => (
      expect(filter[key]).toBeNull()
    ));
  });

  test('play-the-comedy-mean-girls-with-lindsay-lohan', () => {
    const { filter } = getEventAndFilter('play-the-comedy-mean-girls-with-lindsay-lohan.json');

    expect(filter.titles).toEqual(['Girls']);
    expect(filter.actors).toEqual(['Lindsay Lohan', 'Ali Lohan', 'Horst Lohan', 'Dina Lohan', 'Treison Lohan']);
    ['collections', 'genres', 'roles'].forEach(key => (
      expect(filter[key]).toEqual([])
    ));
    ['mediaType', 'season', 'episode'].forEach(key => (
      expect(filter[key]).toBeNull()
    ));
  });

  test('play-thor-with-chris-hemsworth', () => {
    const { filter } = getEventAndFilter('play-thor-with-chris-hemsworth.json');

    expect(filter.collections).toEqual(['Thor']);
    expect(filter.actors).toEqual(['Chris Hemsworth', 'Chelsie Hemsworth', 'Liam Hemsworth', 'Luke Hemsworth', 'Maria Hemsworth']);
    ['titles', 'genres', 'roles'].forEach(key => (
      expect(filter[key]).toEqual([])
    ));
    ['mediaType', 'season', 'episode'].forEach(key => (
      expect(filter[key]).toBeNull()
    ));
  });

  test('play-tv-show-the-orville', () => {
    const { filter } = getEventAndFilter('play-tv-show-the-orville.json');

    expect(filter.titles).toEqual(['The Orville', 'Orville', 'The Orville Preview']);
    ['collections', 'genres', 'actors', 'roles'].forEach(key => (
      expect(filter[key]).toEqual([])
    ));
    expect(filter.mediaType).toBe('tv show');
    ['season', 'episode'].forEach(key => (
      expect(filter[key]).toBeNull()
    ));
  });

  test('watch-jason-statham', () => {
    const { filter } = getEventAndFilter('watch-jason-statham.json');

    expect(filter.actors).toEqual(['Jason Statham', 'Kyley Statham', 'Jake Statham', 'Tony Statham', 'Joe Statham']);
    ['titles', 'collections', 'genres', 'roles'].forEach(key => (
      expect(filter[key]).toEqual([])
    ));
    ['mediaType', 'season', 'episode'].forEach(key => (
      expect(filter[key]).toBeNull()
    ));
  });

  test('watch-season-2-episode-7-of-how-i-met-your-mother', () => {
    const { filter } = getEventAndFilter('watch-season-2-episode-7-of-how-i-met-your-mother.json');

    expect(filter.titles).toEqual(['How I Met Your Mother', 'Goodbye How I Met Your Mother', 'How I Met Your Mother: Extras', 'How I Met Your Puppet Mother']);
    ['collections', 'genres', 'actors', 'roles'].forEach(key => (
      expect(filter[key]).toEqual([])
    ));
    expect(filter.season).toEqual('2');
    expect(filter.episode).toEqual('7');
    ['mediaType'].forEach(key => (
      expect(filter[key]).toBeNull()
    ));
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { sectionFromPath, pathForSection, getBasename } from './sections';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('pathForSection', () => {
  it('maps home to / so / and /home both resolve', () => {
    expect(pathForSection('home')).toBe('/');
  });

  it('maps other sections to /<id>', () => {
    expect(pathForSection('finance')).toBe('/finance');
    expect(pathForSection('networth')).toBe('/networth');
    expect(pathForSection('analytics')).toBe('/analytics');
  });
});

describe('sectionFromPath', () => {
  it('maps / and empty segments to home', () => {
    expect(sectionFromPath('/')).toBe('home');
    expect(sectionFromPath('/home')).toBe('home');
    expect(sectionFromPath('/home/')).toBe('home');
  });

  it('maps known segments', () => {
    expect(sectionFromPath('/finance')).toBe('finance');
    expect(sectionFromPath('/investment')).toBe('investment');
    expect(sectionFromPath('/networth')).toBe('networth');
  });

  it('falls back to home for unknown segments', () => {
    expect(sectionFromPath('/nope')).toBe('home');
    expect(sectionFromPath('/finance/extra')).toBe('finance');
  });

  it('strips the Vite basename (GitHub Pages /financial-analysis)', () => {
    vi.stubEnv('BASE_URL', '/financial-analysis/');
    expect(getBasename()).toBe('/financial-analysis');
    expect(sectionFromPath('/financial-analysis/finance')).toBe('finance');
    expect(sectionFromPath('/financial-analysis/')).toBe('home');
    expect(sectionFromPath('/financial-analysis')).toBe('home');
  });
});

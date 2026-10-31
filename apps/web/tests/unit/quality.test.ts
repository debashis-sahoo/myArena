import { describe, expect, it } from 'vitest';
import { FrameMonitor } from '../../src/features/ludo/quality/adaptive';
import { automaticQuality, chooseQuality, lowerQuality, pixelRatioCap, type DeviceHints } from '../../src/features/ludo/quality/quality';

const hints = (overrides: Partial<DeviceHints> = {}): DeviceHints => ({ memory: 8, cores: 8, pixelRatio: 2, coarsePointer: false, webgl: true, ...overrides });

describe('automatic quality', () => {
  it('uses Lite without WebGL and on small devices', () => {
    expect(automaticQuality(hints({ webgl: false }))).toBe('lite');
    expect(automaticQuality(hints({ memory: 2 }))).toBe('lite');
    expect(automaticQuality(hints({ cores: 2 }))).toBe('lite');
  });

  it('uses High on strong desktops and Standard otherwise', () => {
    expect(automaticQuality(hints())).toBe('high');
    expect(automaticQuality(hints({ coarsePointer: true }))).toBe('standard');
    expect(automaticQuality(hints({ cores: 4 }))).toBe('standard');
    expect(automaticQuality(hints({ memory: 4 }))).toBe('standard');
    expect(automaticQuality(hints({ memory: undefined, cores: undefined }))).toBe('standard');
  });
});

describe('choosing a quality', () => {
  it('lets a manual choice win over the hints', () => {
    expect(chooseQuality(hints({ memory: 2 }), 'high')).toBe('high');
    expect(chooseQuality(hints(), 'lite')).toBe('lite');
    expect(chooseQuality(hints(), null)).toBe('high');
  });

  it('still uses Lite when nothing can be drawn in 3D', () => {
    expect(chooseQuality(hints({ webgl: false }), 'high')).toBe('lite');
  });

  it('steps down one level at a time and never below Lite', () => {
    expect(lowerQuality('high')).toBe('standard');
    expect(lowerQuality('standard')).toBe('lite');
    expect(lowerQuality('lite')).toBe('lite');
    expect(pixelRatioCap('high')).toBeGreaterThan(pixelRatioCap('standard'));
  });
});

describe('the frame monitor', () => {
  it('stays quiet for frames at 60 frames per second', () => {
    let slow = 0;
    const monitor = new FrameMonitor(() => { slow += 1; });
    for (let frame = 0; frame < 600; frame += 1) monitor.record(16.7);
    expect(slow).toBe(0);
  });

  it('asks for a lower level after about 2 seconds over 33 ms, then starts a new window', () => {
    let slow = 0;
    const monitor = new FrameMonitor(() => { slow += 1; });
    for (let frame = 0; frame < 49; frame += 1) monitor.record(40);
    expect(slow).toBe(0);
    monitor.record(40);
    expect(slow).toBe(1);
    for (let frame = 0; frame < 50; frame += 1) monitor.record(40);
    expect(slow).toBe(2);
  });

  it('ignores long pauses, such as a hidden page, instead of counting them as slow frames', () => {
    let slow = 0;
    const monitor = new FrameMonitor(() => { slow += 1; });
    for (let frame = 0; frame < 200; frame += 1) { monitor.record(16.7); monitor.record(900); }
    expect(slow).toBe(0);
  });

  it('judges the average of the window, so a single slow frame does not matter', () => {
    let slow = 0;
    const monitor = new FrameMonitor(() => { slow += 1; });
    for (let frame = 0; frame < 120; frame += 1) monitor.record(frame === 5 ? 200 : 16.7);
    expect(slow).toBe(0);
  });
});

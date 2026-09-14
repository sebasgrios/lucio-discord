import { ulid } from 'ulid';
import type { AudioHandle, AudioPipeline, Track } from '../src/shared/index.js';

export function track(overrides: Partial<Track> = {}): Track {
  return {
    id: ulid(),
    source: 'youtube',
    sourceId: ulid(),
    title: 'Test track',
    artist: 'Test artist',
    url: 'https://www.youtube.com/watch?v=test',
    durationMs: 180_000,
    thumbnailUrl: null,
    requestedBy: 'user-1',
    isLive: false,
    audioFormat: null,
    ...overrides,
  };
}

export class FakeAudioPipeline implements AudioPipeline {
  paused = false;
  destroyed = false;
  current: Track | null = null;
  onIdle: (() => void) | null = null;
  prepared: Track[] = [];

  play(value: Track, onIdle: () => void, onError: (error: Error) => void): Promise<AudioHandle> {
    void onError;
    this.current = value;
    this.onIdle = onIdle;
    return Promise.resolve({ stop: () => this.stop() });
  }

  pause(): boolean {
    this.paused = true;
    return true;
  }
  prepare(value: Track): Promise<void> {
    this.prepared.push(value);
    return Promise.resolve();
  }
  resume(): boolean {
    this.paused = false;
    return true;
  }
  stop(): void {
    this.current = null;
  }
  destroy(): void {
    this.destroyed = true;
    this.stop();
  }
  finish(): void {
    this.current = null;
    this.onIdle?.();
  }
}

import type {
  ProgressiveResolution,
  ResolveRequest,
  SourceAdapter,
  Track,
} from '../../shared/index.js';
import { LucioError } from '../domain/errors.js';

export class SourceRouter {
  constructor(private readonly adapters: SourceAdapter[]) {}

  async resolve(request: ResolveRequest): Promise<Track[]> {
    const result = await this.resolveProgressively(request);
    const remaining = result.remaining ? await result.remaining() : [];
    return [...result.initial, ...remaining];
  }

  async resolveProgressively(request: ResolveRequest): Promise<ProgressiveResolution> {
    const adapter = this.adapters.find((candidate) => candidate.supports(request.input));
    if (!adapter) throw new LucioError('UNSUPPORTED_INPUT', 'No se reconoce la fuente solicitada.');
    const result = adapter.resolveProgressively
      ? await adapter.resolveProgressively(request)
      : await adapter.resolve(request).then((tracks) => ({
          initial: tracks,
          remaining: null,
          expectedCount: tracks.length,
        }));
    if (result.initial.length === 0) {
      throw new LucioError('SOURCE_UNAVAILABLE', 'No se encontraron pistas reproducibles.', 404);
    }
    return result;
  }
}

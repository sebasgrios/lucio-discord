import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Readable } from 'node:stream';
import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  type AudioPlayer,
  type VoiceConnection,
} from '@discordjs/voice';
import type { VoiceBasedChannel } from 'discord.js';
import type { AudioHandle, AudioPipeline, Track } from '../../shared/index.js';
import type { AppConfig } from '../config.js';
import type { Logger } from '../logger.js';
import type { ProcessRunner } from '../sources/process-runner.js';
import type {
  PlaybackTicket,
  PlaybackTicketStore,
  PlaybackTicketCandidate,
} from '../sources/playback-ticket-store.js';
import { YTDLP_AUDIO_FORMAT, withYtDlpRuntime } from '../sources/ytdlp-options.js';
import { openDirectMediaStream } from './direct-media-stream.js';
import { SafeAudioPipe } from './safe-audio-pipe.js';

interface FormatInfo {
  ext: string | undefined;
  acodec: string | undefined;
}

interface InspectionPayload extends PlaybackTicketCandidate {
  requested_downloads?: PlaybackTicketCandidate[];
}

export class DiscordAudioPipeline implements AudioPipeline {
  readonly #player: AudioPlayer;
  readonly #connection: VoiceConnection;
  #processes: ChildProcessWithoutNullStreams[] = [];
  #idleListener: (() => void) | null = null;
  #errorListener: ((error: Error) => void) | null = null;
  #cancelCurrent: (() => void) | null = null;
  #audioPipe: SafeAudioPipe | null = null;
  #sourceAbort: AbortController | null = null;
  readonly #preparations = new Map<string, Promise<FormatInfo>>();

  private constructor(
    channel: VoiceBasedChannel,
    private readonly config: AppConfig,
    private readonly runner: ProcessRunner,
    private readonly logger: Logger,
    private readonly playbackTickets: PlaybackTicketStore,
  ) {
    this.#player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    this.#connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    this.#connection.subscribe(this.#player);
  }

  static async connect(
    channel: VoiceBasedChannel,
    config: AppConfig,
    runner: ProcessRunner,
    logger: Logger,
    playbackTickets: PlaybackTicketStore,
  ): Promise<DiscordAudioPipeline> {
    const connectionStartedAt = performance.now();
    const pipeline = new DiscordAudioPipeline(channel, config, runner, logger, playbackTickets);
    await entersState(pipeline.#connection, VoiceConnectionStatus.Ready, 20_000);
    logger.info(
      { durationMs: Math.round(performance.now() - connectionStartedAt) },
      'voice connection ready',
    );
    return pipeline;
  }

  async play(
    track: Track,
    onIdle: () => void,
    onError: (error: Error) => void,
  ): Promise<AudioHandle> {
    const playbackStartedAt = performance.now();
    this.#cancelCurrent?.();
    this.killProcesses();
    if (this.#idleListener) this.#player.off(AudioPlayerStatus.Idle, this.#idleListener);
    if (this.#errorListener) this.#player.off('error', this.#errorListener);

    const format = await this.ensurePrepared(track);
    const passthrough = format.ext === 'webm' && format.acodec?.startsWith('opus');
    let downloader: ChildProcessWithoutNullStreams | null = null;
    let sourceKind: 'direct' | 'yt-dlp' = 'yt-dlp';
    let input: Readable;
    const ticket = this.playbackTickets.get(track.id);
    if (ticket) {
      try {
        input = await this.openDirectStream(ticket);
        sourceKind = 'direct';
      } catch {
        this.playbackTickets.delete(track.id);
        this.#sourceAbort = null;
        this.logger.warn({ errorCode: 'DIRECT_MEDIA_UNAVAILABLE' }, 'direct media fallback');
        downloader = this.spawnDownloader(track.url);
        input = downloader.stdout;
      }
    } else {
      downloader = this.spawnDownloader(track.url);
      input = downloader.stdout;
    }
    const sourceInput = input;
    let inputType = StreamType.WebmOpus;

    let transcoder: ChildProcessWithoutNullStreams | null = null;
    if (!passthrough) {
      transcoder = spawn(
        this.config.FFMPEG_PATH,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          'pipe:0',
          '-vn',
          '-c:a',
          'libopus',
          '-b:a',
          '128k',
          '-f',
          'ogg',
          'pipe:1',
        ],
        { windowsHide: true },
      );
      this.#processes.push(transcoder);
      input = transcoder.stdout;
      inputType = StreamType.OggOpus;
      transcoder.stderr.on('data', (chunk: Buffer) =>
        this.logger.debug({ message: chunk.toString() }, 'ffmpeg'),
      );
    }

    let active = true;
    let started = false;
    let resolveStarted!: (handle: AudioHandle) => void;
    let rejectStarted!: (error: Error) => void;
    const startedPromise = new Promise<AudioHandle>((resolve, reject) => {
      resolveStarted = resolve;
      rejectStarted = reject;
    });
    const startTimeout = setTimeout(() => {
      if (!active) return;
      active = false;
      this.killProcesses();
      rejectStarted(new Error('El audio no empezó dentro del tiempo máximo.'));
    }, 20_000);
    const fail = (error: Error) => {
      if (!active) return;
      active = false;
      clearTimeout(startTimeout);
      this.killProcesses();
      if (started) onError(error);
      else rejectStarted(error);
    };
    this.#cancelCurrent = () => {
      if (!active) return;
      active = false;
      clearTimeout(startTimeout);
      if (!started) rejectStarted(new Error('La reproducción fue cancelada.'));
    };
    if (transcoder) {
      this.#audioPipe = new SafeAudioPipe(sourceInput, transcoder.stdin, fail);
    }
    downloader?.once('error', fail);
    downloader?.once('close', (code) => {
      if (code !== 0 && code !== null) fail(new Error(`yt-dlp terminó con código ${code}`));
    });
    transcoder?.once('error', fail);
    transcoder?.once('close', (code) => {
      if (code !== 0 && code !== null) fail(new Error(`FFmpeg terminó con código ${code}`));
    });
    this.#errorListener = fail;
    this.#player.once('error', this.#errorListener);

    this.#idleListener = () => {
      if (!active) return;
      if (!started) {
        fail(new Error('El recurso de audio terminó antes de empezar.'));
        return;
      }
      active = false;
      clearTimeout(startTimeout);
      this.killProcesses();
      onIdle();
    };
    this.#player.once(AudioPlayerStatus.Idle, this.#idleListener);
    input.once('readable', () =>
      this.logger.info(
        {
          durationMs: Math.round(performance.now() - playbackStartedAt),
          sourceKind,
          transcoded: !passthrough,
        },
        'first audio byte ready',
      ),
    );
    input.once('error', () => fail(new Error('Falló la lectura del flujo de audio.')));
    const resource = createAudioResource(input, { inputType, metadata: track });
    this.#player.once(AudioPlayerStatus.Playing, () => {
      if (!active) return;
      started = true;
      clearTimeout(startTimeout);
      this.logger.info(
        {
          durationMs: Math.round(performance.now() - playbackStartedAt),
          sourceKind,
          transcoded: !passthrough,
        },
        'audio playback started',
      );
      resolveStarted({ stop: () => this.#player.stop(true) });
    });
    this.#player.play(resource);
    return startedPromise;
  }

  async prepare(track: Track): Promise<void> {
    await this.ensurePrepared(track);
  }

  pause(): boolean {
    return this.#player.pause();
  }
  resume(): boolean {
    return this.#player.unpause();
  }

  stop(): void {
    this.#cancelCurrent?.();
    this.#cancelCurrent = null;
    this.#player.stop(true);
    this.killProcesses();
  }

  destroy(): void {
    this.stop();
    if (this.#connection.state.status !== VoiceConnectionStatus.Destroyed)
      this.#connection.destroy();
  }

  private async ensurePrepared(track: Track): Promise<FormatInfo> {
    const ticket = this.playbackTickets.get(track.id);
    if (ticket) return ticketFormat(ticket, track);
    const active = this.#preparations.get(track.id);
    if (active) return active;
    const preparation = this.inspectPlayback(track).finally(() => {
      this.#preparations.delete(track.id);
    });
    this.#preparations.set(track.id, preparation);
    return preparation;
  }

  private async inspectPlayback(track: Track): Promise<FormatInfo> {
    const result = await this.runner.run(
      this.config.YTDLP_PATH,
      withYtDlpRuntime(
        ['--no-playlist', '--dump-single-json', '-f', YTDLP_AUDIO_FORMAT, track.url],
        {
          cookiesPath: this.config.YTDLP_COOKIES_PATH,
          cacheDir: this.config.YTDLP_CACHE_DIR,
        },
      ),
    );
    if (result.exitCode !== 0) throw new Error('No se pudo inspeccionar el formato de audio.');
    const payload = JSON.parse(result.stdout) as InspectionPayload;
    const selected = selectedPlaybackCandidate(payload);
    this.playbackTickets.set(track.id, selected);
    return {
      ext: selected.ext ?? payload.ext ?? track.audioFormat?.ext,
      acodec: selected.acodec ?? payload.acodec ?? track.audioFormat?.codec,
    };
  }

  private spawnDownloader(url: string): ChildProcessWithoutNullStreams {
    const downloader = this.runner.spawn(
      this.config.YTDLP_PATH,
      withYtDlpRuntime(['--no-playlist', '-f', YTDLP_AUDIO_FORMAT, '-o', '-', url], {
        cookiesPath: this.config.YTDLP_COOKIES_PATH,
        cacheDir: this.config.YTDLP_CACHE_DIR,
      }),
    );
    this.#processes.push(downloader);
    return downloader;
  }

  private async openDirectStream(ticket: PlaybackTicket): Promise<Readable> {
    const controller = new AbortController();
    this.#sourceAbort = controller;
    return openDirectMediaStream(ticket, controller.signal);
  }

  private killProcesses(): void {
    this.#sourceAbort?.abort();
    this.#sourceAbort = null;
    this.#audioPipe?.close();
    this.#audioPipe = null;
    for (const process of this.#processes) {
      if (!process.killed) process.kill();
    }
    this.#processes = [];
  }
}

function ticketFormat(ticket: PlaybackTicket, track: Track): FormatInfo {
  return {
    ext: ticket.ext ?? track.audioFormat?.ext,
    acodec: ticket.codec ?? track.audioFormat?.codec,
  };
}

function selectedPlaybackCandidate(payload: InspectionPayload): PlaybackTicketCandidate {
  const selected =
    payload.requested_downloads?.find(
      (candidate) => candidate.acodec && candidate.acodec !== 'none',
    ) ?? payload;
  const url = selected.url ?? payload.url;
  const ext = selected.ext ?? payload.ext;
  const acodec = selected.acodec ?? payload.acodec;
  const protocol = selected.protocol ?? payload.protocol;
  const httpHeaders = selected.http_headers ?? payload.http_headers;
  return {
    ...(url !== undefined ? { url } : {}),
    ...(ext !== undefined ? { ext } : {}),
    ...(acodec !== undefined ? { acodec } : {}),
    ...(protocol !== undefined ? { protocol } : {}),
    ...(httpHeaders !== undefined ? { http_headers: httpHeaders } : {}),
  };
}

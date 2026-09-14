export class ResolutionSemaphore {
  #active = 0;
  readonly #waiting: Array<() => void> = [];

  constructor(private readonly maximum: number) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.#active >= this.maximum) {
      await new Promise<void>((resolve) => this.#waiting.push(resolve));
    }
    this.#active += 1;
    try {
      return await operation();
    } finally {
      this.#active -= 1;
      this.#waiting.shift()?.();
    }
  }
}

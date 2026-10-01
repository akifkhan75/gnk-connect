export class ConfigService<T = Record<string, unknown>, S extends boolean = false> {
  constructor(private readonly values: Record<string, unknown> = {}) {}
  get(key: string, _opts?: { infer?: boolean }) {
    return this.values[key] as T extends never ? unknown : unknown;
  }
}

export interface PipelineConfig<T> {
  validate?: () => void;
  authorize?: () => Promise<void>;
  run: () => Promise<T>;
}

export async function execute<T>(config: PipelineConfig<T>): Promise<T> {
  config.validate?.();
  await config.authorize?.();
  return config.run();
}

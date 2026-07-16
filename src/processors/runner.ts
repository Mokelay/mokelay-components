import { ProcessorError } from '@/processors/errors';
import { processorRegistry } from '@/processors/registry';
import {
  cloneProcessorValue,
  normalizeProcessorConfig,
  processorName,
  processorParam
} from '@/processors/shared';
import type { ProcessorConfig } from '@/processors/types';

export function normalizeProcessors(value: unknown): ProcessorConfig[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const normalized = normalizeProcessorConfig(item);
    return normalized ? [normalized] : [];
  });
}

export function validateProcessorConfig(config: ProcessorConfig) {
  const normalized = normalizeProcessorConfig(config);
  if (!normalized) {
    throw new ProcessorError('PROCESSOR_INVALID_CONFIG', 'Processor configuration is invalid.');
  }

  const name = processorName(normalized);
  const definition = processorRegistry[name];
  if (!definition) {
    throw new ProcessorError('PROCESSOR_UNSUPPORTED', `Unsupported Processor: ${name}`, name);
  }

  const param = processorParam(normalized);
  definition.validateParam?.(param);
}

export function validateProcessors(processors: ProcessorConfig[]) {
  processors.forEach((processor) => validateProcessorConfig(processor));
}

export function applyProcessor(value: unknown, config: ProcessorConfig) {
  validateProcessorConfig(config);
  const normalized = normalizeProcessorConfig(config)!;
  const definition = processorRegistry[processorName(normalized)];
  const param = processorParam(normalized);
  return definition.execute(value, cloneProcessorValue(param));
}

export function applyProcessors(value: unknown, processors: ProcessorConfig[]) {
  return processors.reduce(
    (current, processor) => applyProcessor(current, processor),
    value
  );
}

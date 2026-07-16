import type { ProcessorErrorCode } from '@/processors/types';

export class ProcessorError extends Error {
  readonly code: ProcessorErrorCode;
  readonly processor?: string;

  constructor(code: ProcessorErrorCode, message: string, processor?: string) {
    super(message);
    this.name = 'ProcessorError';
    this.code = code;
    this.processor = processor;
  }
}

export function invalidProcessorConfig(processor: string, message: string): never {
  throw new ProcessorError(
    'PROCESSOR_INVALID_CONFIG',
    `Processor ${processor} configuration is invalid: ${message}`,
    processor
  );
}

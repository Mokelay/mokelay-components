import type { BlockDataField, VariableValueDataType } from '@/runtime/variableValue';

export function valueBlockDataField(dataType: VariableValueDataType = 'string'): BlockDataField[] {
  return [{
    label: '值',
    variable: 'value',
    dataType
  }];
}

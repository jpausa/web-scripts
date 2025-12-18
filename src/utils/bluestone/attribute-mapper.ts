import type {
  BluestoneAttribute,
  BluestoneAttributeCreateRequest,
  BluestoneAttributeDataType,
  BluestoneAttributeGroupRequest,
} from '../../types/bluestone/bluestone.types'

type ApiDataType =
  | 'boolean'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'time'
  | 'date_time'
  | 'location'
  | 'single_select'
  | 'multi_select'
  | 'text'
  | 'formatted_text'
  | 'pattern'
  | 'multiline'
  | 'column'
  | 'matrix'
  | 'dictionary'

const mapDataType = (dataType: BluestoneAttributeDataType): ApiDataType => {
  const mapping: Record<string, ApiDataType> = {
    text: 'text',
    multiline: 'multiline',
    single_select: 'single_select',
    multi_select: 'multi_select',
    boolean: 'boolean',
    integer: 'integer',
    decimal: 'decimal',
  }
  return mapping[dataType] || 'text'
}

export const mapJsonToBluestoneAttribute = (
  attr: BluestoneAttribute,
  groupId?: string,
): BluestoneAttributeCreateRequest => {
  const request: BluestoneAttributeCreateRequest = {
    name: attr.name,
    dataType: mapDataType(attr.dataType),
  }

  if (attr.number) request.number = attr.number
  if (attr.description) request.description = attr.description
  if (attr.contextAware !== undefined) request.contextAware = attr.contextAware
  if (groupId) request.groupId = groupId

  // Handle select types with enum values
  if ((attr.dataType === 'single_select' || attr.dataType === 'multi_select') && attr.values?.length) {
    request.dataType = attr.dataType
    request.restrictions = {
      enum: { values: attr.values.map(v => ({ value: v.value })) },
    }
  }

  return request
}

export const mapJsonToBluestoneGroup = (group: {
  groupName: string
  groupNumber: string
  groupOrder?: number
}): BluestoneAttributeGroupRequest => ({
  name: group.groupName,
  number: group.groupNumber,
  sortingOrder: group.groupOrder,
})

export const validateAttributeData = (
  attr: BluestoneAttributeCreateRequest,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!attr.name?.trim()) errors.push('Name required')
  if (!attr.number?.trim()) errors.push('Number required')
  if (!attr.dataType?.trim()) errors.push('DataType required')
  if (attr.name && attr.name.length > 255) errors.push('Name too long')
  if (attr.number && !/^[a-zA-Z0-9_-]+$/.test(attr.number)) errors.push('Invalid number format')

  return { isValid: errors.length === 0, errors }
}

export const validateGroupData = (group: BluestoneAttributeGroupRequest): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!group.name?.trim()) errors.push('Name required')
  if (!group.number?.trim()) errors.push('Number required')
  if (group.name && group.name.length > 255) errors.push('Name too long')
  if (group.number && !/^[a-zA-Z0-9_-]+$/.test(group.number)) errors.push('Invalid number format')

  return { isValid: errors.length === 0, errors }
}

export const validateAttributesBatch = (attrs: BluestoneAttributeCreateRequest[]) => {
  const results = attrs.map(attr => ({
    attribute: attr,
    ...validateAttributeData(attr),
  }))
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

  return { isValid: totalErrors === 0, totalErrors, attributeResults: results }
}

export const prepareAttributesForCreation = (attrs: BluestoneAttribute[]) => {
  const validAttributes: BluestoneAttributeCreateRequest[] = []
  const invalidAttributes: Array<{
    original: BluestoneAttribute
    transformed: BluestoneAttributeCreateRequest
    errors: string[]
  }> = []

  for (const attr of attrs) {
    const transformed = mapJsonToBluestoneAttribute(attr)
    const { isValid, errors } = validateAttributeData(transformed)

    if (isValid) {
      validAttributes.push(transformed)
    } else {
      invalidAttributes.push({ original: attr, transformed, errors })
    }
  }

  return { validAttributes, invalidAttributes }
}

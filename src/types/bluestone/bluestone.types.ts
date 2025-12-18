/**
 * Bluestone API Types
 *
 * Type definitions for Bluestone attribute responses and related data structures.
 * Generated from export-attributes.json structure analysis.
 */

/**
 * Represents a single attribute value option for select-type attributes
 */
export interface BluestoneAttributeValue {
  /** Unique identifier for this attribute value */
  valueId: string
  /** Number/code identifier for this value */
  number: string
  /** Human-readable display value */
  value: string
}

/**
 * Supported data types for Bluestone attributes
 */
export type BluestoneAttributeDataType =
  | 'text'
  | 'multiline'
  | 'single_select'
  | 'multi_select'
  | 'boolean'
  | 'integer'
  | 'decimal'

/**
 * Represents a single Bluestone attribute definition
 */
export interface BluestoneAttribute {
  /** Display order within the group */
  order: number
  /** Order of the group this attribute belongs to */
  groupOrder: number
  /** Unique identifier of the attribute group */
  groupId: string
  /** Human-readable name of the attribute group */
  groupName: string
  /** Code/number identifier for the group */
  groupNumber: string
  /** Sorting order for this attribute */
  sortingOrder: number
  /** Unique identifier for this attribute */
  id: string
  /** Human-readable name of the attribute */
  name: string
  /** Code/number identifier for this attribute */
  number: string
  /** Optional description explaining the attribute's purpose */
  description?: string
  /** Data type that determines how values are stored and validated */
  dataType: BluestoneAttributeDataType
  /** Available values for select-type attributes (empty for other types) */
  values: BluestoneAttributeValue[]
  /** Whether this attribute supports compound/complex values */
  isCompound: boolean
  /** Whether this attribute is context-aware (varies by context/locale) */
  contextAware: boolean
}

/**
 * Response type for Bluestone attributes export/list operations
 * Array of attribute definitions
 */
export type BluestoneAttributesResponse = BluestoneAttribute[]

/**
 * Grouped attributes by their group information
 * Useful for organizing attributes by their logical groupings
 */
export interface BluestoneAttributeGroup {
  /** Group metadata */
  groupId: string
  groupName: string
  groupNumber: string
  groupOrder: number
  /** Attributes belonging to this group */
  attributes: BluestoneAttribute[]
}

/**
 * Utility type for organizing attributes by groups
 */
export type BluestoneAttributesByGroup = Record<string, BluestoneAttributeGroup>

/**
 * Filter options for querying Bluestone attributes
 */
export interface BluestoneAttributeFilter {
  /** Filter by specific group IDs */
  groupIds?: string[]
  /** Filter by data types */
  dataTypes?: BluestoneAttributeDataType[]
  /** Filter by context awareness */
  contextAware?: boolean
  /** Filter by compound support */
  isCompound?: boolean
  /** Search by attribute name or description */
  search?: string
}

/**
 * Options for attribute value operations
 */
export interface BluestoneAttributeValueOptions {
  /** The attribute ID to work with */
  attributeId: string
  /** Values to add/update/remove */
  values: Partial<BluestoneAttributeValue>[]
}

/**
 * Request payload for creating/updating Bluestone attributes
 */
export interface BluestoneAttributeRequest {
  /** Attribute name */
  name: string
  /** Attribute number/code */
  number: string
  /** Optional description */
  description?: string
  /** Data type */
  dataType: BluestoneAttributeDataType
  /** Group ID where this attribute belongs */
  groupId: string
  /** Sorting order */
  sortingOrder?: number
  /** Whether attribute is compound */
  isCompound?: boolean
  /** Whether attribute is context-aware */
  contextAware?: boolean
  /** Initial values for select-type attributes */
  values?: Omit<BluestoneAttributeValue, 'valueId'>[]
}

/**
 * Response type for attribute operations (create/update/delete)
 */
export interface BluestoneAttributeOperationResponse {
  /** Whether the operation was successful */
  success: boolean
  /** The affected attribute (for create/update operations) */
  attribute?: BluestoneAttribute
  /** Error message if operation failed */
  error?: string
  /** Additional operation details */
  details?: string
}

/**
 * Request payload for creating Bluestone attribute groups
 */
export interface BluestoneAttributeGroupRequest {
  /** Group name */
  name: string
  /** Group number/code identifier */
  number: string
  /** Optional description */
  description?: string
  /** Optional sorting order */
  sortingOrder?: number
}

/**
 * Request payload for creating Bluestone attributes via Management API
 * Based on official API documentation: https://docs.api.bluestonepim.com/reference/createattributedefinition
 */
export interface BluestoneAttributeCreateRequest {
  /** Attribute name (required) */
  name: string
  /** Attribute number/code */
  number?: string
  /** Data type (required) - must be one of the valid enum values */
  dataType:
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
  /** Optional description */
  description?: string
  /** Whether attribute is context aware */
  contextAware?: boolean
  /** Character set used for the attribute definition */
  charset?: string
  /** Content type associated with the attribute definition */
  contentType?: string
  /** External source flag */
  externalSource?: boolean
  /** Group ID for the attribute */
  groupId?: string
  /** Internal flag */
  internal?: boolean
  /** Restrictions associated with the attribute definition */
  restrictions?: {
    /** For select-type attributes (single_select, multi_select) - correct format */
    enum?: {
      values: Array<{
        value: string
      }>
    }
  }
  /** Unit of measurement for the attribute definition */
  unit?: string
}

/**
 * Standard API response wrapper for Bluestone operations
 */
export interface BluestoneApiResponse {
  /** Whether the operation was successful */
  success: boolean
  /** Resource ID returned in response header (for create operations) */
  resourceId?: string | null
  /** Response data */
  data?: Record<string, unknown>
  /** Error message if operation failed */
  error?: string
}

/**
 * Import operation plan for orchestrating the import process
 */
export interface BluestoneImportPlan {
  /** Groups that need to be created */
  groupsToCreate: BluestoneAttributeGroupRequest[]
  /** Attributes that should be kept (already exist and match) */
  attributesToKeep: BluestoneAttribute[]
  /** Attributes that need to be deleted */
  attributesToDelete: BluestoneAttribute[]
  /** Attributes that need to be created */
  attributesToCreate: BluestoneAttributeCreateRequest[]
  /** Mapping of group numbers to their IDs (for assignment) */
  groupMapping: Record<string, string>
}

/**
 * Result of import operations
 */
export interface BluestoneImportResult {
  /** Whether the overall import was successful */
  success: boolean
  /** Created groups with their IDs */
  createdGroups: Array<{ groupNumber: string; groupId: string }>
  /** Created attributes with their IDs */
  createdAttributes: Array<{ attributeNumber: string; attributeId: string }>
  /** Deleted attributes */
  preservedAttributes: Array<{ attributeNumber: string; attributeId: string }>
  /** Assignment results */
  assignmentResults: Array<{ groupId: string; attributeIds: string[] }>
  /** Any errors that occurred */
  errors: string[]
}

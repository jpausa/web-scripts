import { bluestoneClient } from '../../clients/bluestone'
import type {
  BluestoneAttribute,
  BluestoneAttributeGroupRequest,
  BluestoneImportPlan,
  BluestoneImportResult,
} from '../../types/bluestone/bluestone.types'
import { mapJsonToBluestoneAttribute, prepareAttributesForCreation } from './attribute-mapper'
import { createGroupsFromAttributes, extractUniqueGroups } from './group-manager'

const attributeExists = (exported: BluestoneAttribute, existingAttrs: BluestoneAttribute[]) =>
  existingAttrs.some(e => e.number === exported.number || e.name.toLowerCase() === exported.name.toLowerCase())

export const planImportOperations = async (
  exportedAttrs: BluestoneAttribute[],
  existingAttrs: BluestoneAttribute[],
  keepExisting: boolean,
): Promise<BluestoneImportPlan> => {
  const uniqueGroups = extractUniqueGroups(exportedAttrs)

  // Fetch existing groups
  let existingGroups: Array<{ id: string; name: string; number: string }> = []
  try {
    const response = await bluestoneClient.getAttributeGroups()
    if (Array.isArray(response)) existingGroups = response
  } catch {
    /* ignore */
  }

  const existingGroupNums = new Set(existingGroups.map(g => g.number))
  const existingGroupNames = new Set(existingGroups.map(g => g.name.toLowerCase()))

  const groupsToCreate: BluestoneAttributeGroupRequest[] = uniqueGroups
    .filter(g => !existingGroupNums.has(g.groupNumber) && !existingGroupNames.has(g.groupName.toLowerCase()))
    .map(g => ({
      name: g.groupName,
      number: g.groupNumber,
      sortingOrder: g.groupOrder,
    }))

  const toKeep = existingAttrs.filter(e =>
    exportedAttrs.some(exp => e.number === exp.number || e.name.toLowerCase() === exp.name.toLowerCase()),
  )

  const toPreserve = existingAttrs.filter(
    e => !exportedAttrs.some(exp => e.number === exp.number || e.name.toLowerCase() === exp.name.toLowerCase()),
  )

  const toCreateAttrs = exportedAttrs
    .filter(exp => !attributeExists(exp, existingAttrs))
    .map(attr => mapJsonToBluestoneAttribute(attr))

  return {
    groupsToCreate,
    attributesToKeep: keepExisting ? toKeep : [...existingAttrs],
    attributesToDelete: toPreserve,
    attributesToCreate: toCreateAttrs,
    groupMapping: {},
  }
}

export const executeImportPlan = async (
  plan: BluestoneImportPlan,
  exportedAttrs: BluestoneAttribute[],
): Promise<BluestoneImportResult> => {
  const result: BluestoneImportResult = {
    success: false,
    createdGroups: [],
    createdAttributes: [],
    preservedAttributes: [],
    assignmentResults: [],
    errors: [],
  }

  try {
    // Phase 1: Ensure groups exist
    console.log('\n📁 Processing groups...')
    const groupMapping = await createGroupsFromAttributes(exportedAttrs)
    plan.groupMapping = groupMapping

    for (const [groupNumber, groupId] of Object.entries(groupMapping)) {
      result.createdGroups.push({ groupNumber, groupId })
    }

    // Track preserved attributes
    for (const attr of plan.attributesToDelete) {
      result.preservedAttributes.push({
        attributeNumber: attr.number,
        attributeId: attr.id,
      })
    }

    // Phase 2: Create new attributes
    if (plan.attributesToCreate.length > 0) {
      console.log(`\n📝 Creating ${plan.attributesToCreate.length} attributes...`)

      const { validAttributes, invalidAttributes } = prepareAttributesForCreation(
        exportedAttrs.filter(exp => plan.attributesToCreate.some(c => c.number === exp.number)),
      )

      if (invalidAttributes.length > 0) {
        const msg = `${invalidAttributes.length} invalid attributes`
        for (const inv of invalidAttributes) {
          console.log(`   ✗ ${inv.original.name}: ${inv.errors.join(', ')}`)
        }
        result.errors.push(msg)
        throw new Error(msg)
      }

      for (const attr of validAttributes) {
        try {
          const original = exportedAttrs.find(e => e.number === attr.number)
          if (original?.groupNumber && groupMapping[original.groupNumber]) {
            attr.groupId = groupMapping[original.groupNumber]
          }

          const response = await bluestoneClient.createAttribute(attr)
          if (response.success && response.resourceId) {
            result.createdAttributes.push({
              attributeNumber: attr.number || '',
              attributeId: response.resourceId,
            })
            console.log(`   ✓ ${attr.name}`)
          } else {
            throw new Error('No resource ID')
          }
        } catch (error) {
          const msg = `Failed: ${attr.name} - ${error}`
          result.errors.push(msg)
          throw error
        }
      }
    }

    result.success = result.errors.length === 0
    return result
  } catch (error) {
    result.success = false
    if (!result.errors.includes(String(error))) {
      result.errors.push(String(error))
    }
    return result
  }
}

export const executeCompleteImport = async (
  exportedAttrs: BluestoneAttribute[],
  existingAttrs: BluestoneAttribute[],
  keepExisting: boolean,
): Promise<BluestoneImportResult> => {
  const plan = await planImportOperations(exportedAttrs, existingAttrs, keepExisting)
  return executeImportPlan(plan, exportedAttrs)
}

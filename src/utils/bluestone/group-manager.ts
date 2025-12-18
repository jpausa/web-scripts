import { bluestoneClient } from '../../clients/bluestone'
import type { BluestoneAttribute } from '../../types/bluestone/bluestone.types'

export interface AttributeGroupInfo {
  groupId: string
  groupName: string
  groupNumber: string
  groupOrder: number
  attributes: BluestoneAttribute[]
}

type ExistingGroup = {
  id: string
  name: string
  number: string
  orderByName?: boolean
}

const parseGroupsResponse = (response: unknown): ExistingGroup[] => {
  if (Array.isArray(response)) return response
  if (response && typeof response === 'object') {
    const data = (response as { data?: unknown[] }).data
    if (Array.isArray(data)) return data as ExistingGroup[]
  }
  return []
}

export const ensureAttributeGroupExists = async (groupData: {
  groupName: string
  groupNumber: string
  groupOrder?: number
}): Promise<string> => {
  try {
    const existingGroups = parseGroupsResponse(await bluestoneClient.getAttributeGroups())
    const existing = existingGroups.find(g => g.number === groupData.groupNumber)

    if (existing) {
      console.log(`   ✓ Found: ${groupData.groupName}`)
      return existing.id
    }

    console.log(`   ➕ Creating: ${groupData.groupName}`)
    const response = await bluestoneClient.createAttributeGroup({
      name: groupData.groupName,
      number: groupData.groupNumber,
      sortingOrder: groupData.groupOrder,
    })

    if (!response.success || !response.resourceId) {
      throw new Error(`No resource ID returned for ${groupData.groupName}`)
    }

    return response.resourceId
  } catch (error) {
    // Handle 409 Conflict - group already exists
    if (error instanceof Error && error.message.includes('409 Conflict')) {
      const match = error.message.match(/"entityId":"([^"]+)"/)
      if (match?.[1]) return match[1]

      // Fallback: fetch again
      const groups = parseGroupsResponse(await bluestoneClient.getAttributeGroups())
      const found = groups.find(g => g.name === groupData.groupName || g.number === groupData.groupNumber)
      if (found) return found.id
    }
    throw error
  }
}

export const getOrCreateAttributeGroup = (groupName: string, groupNumber: string) =>
  ensureAttributeGroupExists({ groupName, groupNumber })

export const organizeAttributesByGroup = (attributes: BluestoneAttribute[]): Record<string, AttributeGroupInfo> => {
  const map: Record<string, AttributeGroupInfo> = {}

  for (const attr of attributes) {
    if (!map[attr.groupNumber]) {
      map[attr.groupNumber] = {
        groupId: attr.groupId,
        groupName: attr.groupName,
        groupNumber: attr.groupNumber,
        groupOrder: attr.groupOrder,
        attributes: [],
      }
    }
    map[attr.groupNumber].attributes.push(attr)
  }

  return map
}

export const extractUniqueGroups = (attributes: BluestoneAttribute[]) => {
  const map = new Map<
    string,
    {
      groupId: string
      groupName: string
      groupNumber: string
      groupOrder: number
    }
  >()

  for (const attr of attributes) {
    if (!map.has(attr.groupNumber)) {
      map.set(attr.groupNumber, {
        groupId: attr.groupId,
        groupName: attr.groupName,
        groupNumber: attr.groupNumber,
        groupOrder: attr.groupOrder,
      })
    }
  }

  return Array.from(map.values())
}

export const createGroupsFromAttributes = async (attributes: BluestoneAttribute[]): Promise<Record<string, string>> => {
  const uniqueGroups = extractUniqueGroups(attributes)
  const mapping: Record<string, string> = {}

  console.log(`   Processing ${uniqueGroups.length} groups...`)

  for (const group of uniqueGroups) {
    const groupId = await ensureAttributeGroupExists({
      groupName: group.groupName,
      groupNumber: group.groupNumber,
      groupOrder: group.groupOrder,
    })
    mapping[group.groupNumber] = groupId
  }

  return mapping
}

import { environment } from '../environment'
import type {
  BluestoneApiResponse,
  BluestoneAttributeCreateRequest,
  BluestoneAttributeGroupRequest,
} from '../types/bluestone/bluestone.types'

const getToken = async (): Promise<{
  access_token: string
  token_type: string
}> => {
  const response = await fetch(environment.bluestone.authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: environment.bluestone.clientId,
      client_secret: environment.bluestone.clientSecret,
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<{
    access_token: string
    token_type: string
  }>
}

const getAuthHeaders = async () => {
  const token = await getToken()
  return {
    Authorization: `${token.token_type} ${token.access_token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

const getAttributes = async () => {
  const items: unknown[] = []
  const itemsOnPage = 50
  let pageNo = 1

  while (true) {
    const response = await fetch(
      `${environment.bluestone.getAttributesUrl}?pageNo=${pageNo}&itemsOnPage=${itemsOnPage}`,
      {
        headers: {
          'x-api-key': environment.bluestone.apiKey,
          Accept: 'application/json',
          context: environment.bluestone.context,
        },
      },
    )

    const json = await response.json()
    if (!response.ok) throw new Error(`API error: ${JSON.stringify(json)}`)

    const data = json as { results?: unknown[] }
    if (!data.results) throw new Error('Unexpected response shape')

    if (data.results.length === 0) break

    items.push(...data.results)
    if (data.results.length < itemsOnPage) break
    pageNo++
  }

  return items
}

const getAttributeGroups = async () => {
  const groups: Array<{ id: string; name: string; number: string }> = []
  const pageSize = 1000
  let page = 0
  let hasMore = true

  while (hasMore) {
    const headers = await getAuthHeaders()
    const url = `${environment.bluestone.attributeGroupsUrl}?page=${page}&pageSize=${pageSize}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...headers, context: environment.bluestone.context },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Failed to get groups: ${response.status} - ${text}`)
    }

    const json = (await response.json()) as { data?: unknown[] }
    const pageGroups = (json.data || []) as typeof groups

    groups.push(...pageGroups)
    page++

    hasMore = pageGroups.length >= pageSize
  }

  return groups
}

const createAttributeGroup = async (group: BluestoneAttributeGroupRequest): Promise<BluestoneApiResponse> => {
  const headers = await getAuthHeaders()
  const response = await fetch(environment.bluestone.attributeGroupsUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(group),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      conflictingEntities?: Array<{ entityId: string }>
    }

    // Handle 409 Conflict - group already exists
    if (response.status === 409) {
      const existingId = error.conflictingEntities?.[0]?.entityId || 'unknown'
      console.log(`   ⚠️ Group "${group.name}" already exists (${existingId})`)
      return {
        success: true,
        resourceId: existingId,
        data: { alreadyExists: true },
      }
    }

    throw new Error(`Failed to create group: ${response.status} - ${JSON.stringify(error)}`)
  }

  return {
    success: true,
    resourceId: response.headers.get('resource-id'),
    data: await response.json().catch(() => ({})),
  }
}

const createAttribute = async (attribute: BluestoneAttributeCreateRequest): Promise<BluestoneApiResponse> => {
  const headers = await getAuthHeaders()
  const response = await fetch(environment.bluestone.definitionsUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(attribute),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      conflictingEntities?: Array<{ entityId: string }>
    }

    // Handle 409 Conflict
    if (response.status === 409) {
      return {
        success: true,
        resourceId: error.conflictingEntities?.[0]?.entityId || 'unknown',
        data: { alreadyExists: true },
      }
    }

    throw new Error(`Failed to create attribute: ${response.status} - ${JSON.stringify(error)}`)
  }

  return {
    success: true,
    resourceId: response.headers.get('resource-id'),
    data: await response.json().catch(() => ({})),
  }
}

export const bluestoneClient = {
  getToken,
  getAttributes,
  getAttributeGroups,
  createAttributeGroup,
  createAttribute,
}

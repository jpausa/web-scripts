import type { Type } from '@commercetools/platform-sdk'
import { commercetoolsClient } from '../../clients/commercetools'

export const getAllCustomTypes = async (): Promise<Type[]> => {
  try {
    let offset = 0
    const limit = 20
    const customTypes: Type[] = []
    while (true) {
      const customTypesResponse = await commercetoolsClient
        .types()
        .get({
          queryArgs: {
            limit,
            offset,
            withTotal: true,
          },
        })
        .execute()
      customTypes.push(...customTypesResponse.body.results)
      offset += limit
      if (offset >= (customTypesResponse.body.total ?? 0)) break
    }

    if (!customTypes.length) {
      console.log('No custom types found')
      return []
    }

    return customTypes
  } catch (error) {
    console.error(JSON.stringify(error))
    return []
  }
}

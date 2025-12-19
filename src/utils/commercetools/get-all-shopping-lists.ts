import type { ShoppingList } from '@commercetools/platform-sdk'
import { commercetoolsClient } from '../../clients/commercetools'

export const getAllShoppingLists = async (): Promise<ShoppingList[]> => {
  try {
    let offset = 0
    const limit = 20
    const shoppingLists: ShoppingList[] = []
    while (true) {
      const shoppingListsResponse = await commercetoolsClient
        .shoppingLists()
        .get({
          queryArgs: {
            limit,
            offset,
            withTotal: true,
          },
        })
        .execute()
      shoppingLists.push(...shoppingListsResponse.body.results)
      offset += limit
      if (offset >= (shoppingListsResponse.body.total ?? 0)) break
    }

    if (!shoppingLists.length) {
      console.log('No shopping lists found')
      return []
    }

    return shoppingLists
  } catch (error) {
    console.error(JSON.stringify(error))
    return []
  }
}

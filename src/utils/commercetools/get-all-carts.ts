import type { Cart } from '@commercetools/platform-sdk'
import { commercetoolsClient } from '../../clients/commercetools'

export const getAllCarts = async (): Promise<Cart[]> => {
  try {
    let offset = 0
    const limit = 20
    const carts: Cart[] = []
    while (true) {
      const cartsResponse = await commercetoolsClient
        .carts()
        .get({
          queryArgs: {
            limit,
            offset,
            withTotal: true,
          },
        })
        .execute()
      carts.push(...cartsResponse.body.results)
      offset += limit
      if (offset >= (cartsResponse.body.total ?? 0)) break
    }

    if (!carts.length) {
      console.log('No carts found')
      return []
    }

    return carts
  } catch (error) {
    console.error(JSON.stringify(error))
    return []
  }
}

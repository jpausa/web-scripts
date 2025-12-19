import type { ShoppingList } from '@commercetools/platform-sdk'
import { confirm } from '@inquirer/prompts'
import { commercetoolsClient } from '../../clients/commercetools'
import { getAllCarts } from '../../utils/commercetools/get-all-carts'
import { getAllShoppingLists } from '../../utils/commercetools/get-all-shopping-lists'

/**
 * It removes quotes(shopping lists) that no longer have a valid(non expired) cart attached
 * This script is intended for specific use case where we have quotes that should have a cart attached
 * by using the cart_reference_id custom field.
 *
 * This script is intended to be used as a cleanup script to remove quotes that are no longer needed.
 */
export default async () => {
  console.log('Starting orphan quotes removal process...')

  try {
    const quotes = await getAllShoppingLists()
    const carts = await getAllCarts()
    console.log(`Found ${quotes.length} quotes and ${carts.length} carts`)

    const quotesToDelete: ShoppingList[] = []

    for (const quote of quotes) {
      if (quote.custom?.fields?.cart_reference_id) {
        const cart = carts.find(cart => cart.id === quote.custom?.fields?.cart_reference_id)
        if (!cart) {
          quotesToDelete.push(quote)
        }
      } else {
        quotesToDelete.push(quote)
      }
    }

    console.log(`Found ${quotesToDelete.length} orphan quotes to delete`)

    if (quotesToDelete.length === 0) {
      return
    }

    console.log(
      'Quotes to delete:',
      quotesToDelete.map(q => ({ id: q.id, name: q.name?.en || q.name })),
    )

    const proceed = await confirm({
      message: `\nProceed with removal of ${quotesToDelete.length} orphan quotes?`,
      default: false,
    })

    if (!proceed) {
      console.log('Operation cancelled by user')
      return
    }

    const removeQuotesPromises = quotesToDelete.map(quote =>
      commercetoolsClient
        .shoppingLists()
        .withId({ ID: quote.id })
        .delete({
          queryArgs: {
            version: quote.version,
          },
        })
        .execute(),
    )

    await Promise.all(removeQuotesPromises)
    console.log(`Successfully removed ${quotesToDelete.length} orphan quotes`)
  } catch (error) {
    console.error('Error during orphan quotes removal:', JSON.stringify(error))
  }
}

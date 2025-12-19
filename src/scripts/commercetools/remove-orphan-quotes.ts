import type { Cart, ShoppingList } from '@commercetools/platform-sdk'
import { confirm } from '@inquirer/prompts'
import { commercetoolsClient } from '../../clients/commercetools'
import { calculateDaysUntilExpiration } from '../../utils/commercetools/calculate-days-until-expiration'
import { getAllCarts } from '../../utils/commercetools/get-all-carts'
import { getAllShoppingLists } from '../../utils/commercetools/get-all-shopping-lists'

/**
 * It removes quotes(shopping lists) that no longer have a valid(non expired) cart attached
 * This script is intended for specific use case where we have quotes that should have a cart attached
 * by using the cart_reference_id custom field.
 *
 * This script is intended to be used as a cleanup script to remove quotes that are no longer needed.
 * Additionally, it updates the expiration date of frozen carts to be 365 days from creation date.
 */
export default async () => {
  console.log('Starting orphan quotes removal process...')

  try {
    const quotes = await getAllShoppingLists()
    const carts = await getAllCarts()
    console.log(`Found ${quotes.length} quotes and ${carts.length} carts`)

    const quotesToDelete: ShoppingList[] = []
    const frozenCartsToUpdate: Cart[] = []

    for (const quote of quotes) {
      if (quote.custom?.fields?.cart_reference_id) {
        const cart = carts.find(cart => cart.id === quote.custom?.fields?.cart_reference_id)
        if (!cart) {
          quotesToDelete.push(quote)
        } else if (cart.cartState === 'Frozen') {
          frozenCartsToUpdate.push(cart)
        }
      } else {
        quotesToDelete.push(quote)
      }
    }

    console.log(`Found ${quotesToDelete.length} orphan quotes to delete`)
    console.log(`Found ${frozenCartsToUpdate.length} frozen carts to update`)

    if (quotesToDelete.length === 0 && frozenCartsToUpdate.length === 0) {
      console.log('Nothing to do')
      return
    }

    // Handle orphan quotes deletion
    if (quotesToDelete.length > 0) {
      console.log(
        'Quotes to delete:',
        quotesToDelete.map(q => ({ id: q.id, name: q.name?.en || q.name })),
      )

      const proceedWithQuotesDeletion = await confirm({
        message: `\nProceed with removal of ${quotesToDelete.length} orphan quotes?`,
        default: false,
      })

      if (proceedWithQuotesDeletion) {
        console.log('Removing quotes...')
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
      } else {
        console.log('Quotes deletion skipped by user')
      }
    }

    // Handle frozen carts expiration update
    if (frozenCartsToUpdate.length) {
      console.log(
        'Frozen carts to update:',
        frozenCartsToUpdate.map(c => ({ id: c.id, createdAt: c.createdAt })),
      )

      const proceedWithCartsUpdate = await confirm({
        message: `\nProceed with expiration update of ${frozenCartsToUpdate.length} frozen carts?`,
        default: false,
      })

      if (proceedWithCartsUpdate) {
        console.log('Updating frozen carts expiration...')
        const updateCartsPromises = frozenCartsToUpdate.map(cart => {
          const daysUntilExpiration = calculateDaysUntilExpiration(cart.createdAt)
          return commercetoolsClient
            .carts()
            .withId({ ID: cart.id })
            .post({
              body: {
                version: cart.version,
                actions: [
                  {
                    action: 'setDeleteDaysAfterLastModification',
                    deleteDaysAfterLastModification: daysUntilExpiration,
                  },
                ],
              },
            })
            .execute()
        })
        await Promise.all(updateCartsPromises)
        console.log(`Successfully updated ${frozenCartsToUpdate.length} frozen carts`)
      } else {
        console.log('Carts update skipped by user')
      }
    }

    console.log('Process completed')
  } catch (error) {
    console.error('Error during orphan quotes removal:', JSON.stringify(error))
  }
}

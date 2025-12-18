import { resolve } from 'node:path'
import type { Type } from '@commercetools/platform-sdk'
import { confirm, select } from '@inquirer/prompts'
import { commercetoolsClient } from '../../clients/commercetools'
import { environment } from '../../environment'
import { getAllCustomTypes } from '../../utils/commercetools/get-all-custom-types'

export default async () => {
  try {
    console.log('\n🔷 CommerceTools Custom Types Import')
    console.log('=====================================\n')

    const updateBUType = await select({
      message: 'Update existing Business Unit custom types?',
      choices: [
        { name: 'Yes - Include business-unit-type', value: true },
        { name: 'No - Protect business-unit-type', value: false },
      ],
    })

    console.log('📁 Loading data...')

    const fullPath = resolve(__dirname, '../../outputs/commercetools/export-custom-types.json')
    const importedData = (await import(fullPath)) as unknown as {
      default: Type[]
    }
    const exportedTypes = importedData.default || (importedData as unknown as Type[])
    const existingTypes = (await getAllCustomTypes()) ?? []

    console.log(`✓ ${exportedTypes.length} exported, ${existingTypes.length} existing\n`)

    // Calculate what needs to be done
    const shouldProcess = (key: string) => updateBUType || key !== 'business-unit-type'

    const toUpdate = exportedTypes.filter(ct => existingTypes.some(e => e.key === ct.key) && shouldProcess(ct.key))

    const toCreate = exportedTypes.filter(ct => !existingTypes.some(e => e.key === ct.key) && shouldProcess(ct.key))

    const extraTypes = existingTypes.filter(ct => !exportedTypes.some(e => e.key === ct.key) && shouldProcess(ct.key))

    // Preview
    console.log('📋 Preview:')
    console.log(`   🔄 To update: ${toUpdate.length}`)
    console.log(`   ➕ To create: ${toCreate.length}`)
    console.log(`   📋 Extra (preserved): ${extraTypes.length}`)
    if (!updateBUType) console.log('   🛡️  Protected: business-unit-type')

    if (toUpdate.length > 0) {
      console.log('\n🔄 Will update (add missing fields):')
      for (const ct of toUpdate.slice(0, 5)) {
        console.log(`   - ${ct.name.en ?? ct.key} (${ct.fieldDefinitions?.length || 0} fields)`)
      }
      if (toUpdate.length > 5) console.log(`   ... and ${toUpdate.length - 5} more`)
    }

    if (toCreate.length > 0) {
      console.log('\n✨ Will create:')
      for (const ct of toCreate.slice(0, 5)) {
        console.log(`   - ${ct.name.en ?? ct.key}`)
      }
      if (toCreate.length > 5) console.log(`   ... and ${toCreate.length - 5} more`)
    }

    const proceed = await confirm({
      message: `\nProceed with import to "${environment.commercetools.projectKey}"?`,
      default: false,
    })

    if (!proceed) {
      console.log('\n❌ Cancelled')
      return { success: false, message: 'Cancelled' }
    }

    console.log('\n🚀 Importing...')

    const results = {
      updated: [] as string[],
      created: [] as string[],
      errors: [] as string[],
    }

    // Phase 1: Update existing (add missing fields)
    for (const exportedType of toUpdate) {
      const existing = existingTypes.find(e => e.key === exportedType.key)
      if (!existing) continue

      const existingFieldNames = existing.fieldDefinitions.map(f => f.name)
      const missingFields = exportedType.fieldDefinitions.filter(f => !existingFieldNames.includes(f.name))

      if (missingFields.length === 0) continue

      try {
        let currentVersion = (await commercetoolsClient.types().withKey({ key: exportedType.key }).get().execute()).body
          .version

        for (const field of missingFields) {
          const response = await commercetoolsClient
            .types()
            .withKey({ key: exportedType.key })
            .post({
              body: {
                version: currentVersion,
                actions: [{ action: 'addFieldDefinition', fieldDefinition: field }],
              },
            })
            .execute()
          currentVersion = response.body.version
        }

        results.updated.push(exportedType.key)
        console.log(`   ✓ Updated ${exportedType.key} (+${missingFields.length} fields)`)
      } catch (error) {
        console.log(`   ⚠️ Failed to update ${exportedType.key}: ${error}`)
      }
    }

    // Phase 2: Create new types
    for (const ct of toCreate) {
      try {
        await commercetoolsClient.types().post({ body: ct }).execute()
        results.created.push(ct.key)
        console.log(`   ✓ Created ${ct.key}`)
      } catch (error) {
        results.errors.push(`${ct.key}: ${error}`)
        console.log(`   ⚠️ Failed to create ${ct.key}: ${error}`)
      }
    }

    // Summary
    console.log('\n📊 Results:')
    console.log(`   ✓ Updated: ${results.updated.length}`)
    console.log(`   ✓ Created: ${results.created.length}`)
    if (results.errors.length) console.log(`   ✗ Errors: ${results.errors.length}`)

    return { success: results.errors.length === 0, ...results }
  } catch (error) {
    console.error('\n💥 Error:', error)
    return { success: false, error: String(error) }
  }
}

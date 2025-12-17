import { resolve } from 'node:path'
import { confirm } from '@inquirer/prompts'
import { bluestoneClient } from '../../clients/bluestone'
import type { BluestoneAttribute } from '../../types/bluestone/bluestone.types'
import { executeCompleteImport } from '../../utils/bluestone/import-orchestrator'

export default async () => {
  try {
    console.log('\n🔷 Bluestone Attributes Import')
    console.log('==============================\n')

    console.log('🛡️  Safe Mode: Only adds missing attributes, never deletes\n')

    // Load data
    const fullPath = resolve(__dirname, '../../outputs/bluestone/export-attributes.json')
    const importedData = (await import(fullPath)) as unknown as {
      default: BluestoneAttribute[]
    }
    const exportedAttrs = importedData.default || (importedData as unknown as BluestoneAttribute[])
    const existingAttrs = (await bluestoneClient.getAttributes()) as BluestoneAttribute[]

    console.log(`✓ ${exportedAttrs.length} exported, ${existingAttrs.length} existing`)

    // Helper to check existence by number OR name
    const exists = (exported: BluestoneAttribute) =>
      existingAttrs.some(e => e.number === exported.number || e.name.toLowerCase() === exported.name.toLowerCase())

    const toKeep = existingAttrs.filter(e =>
      exportedAttrs.some(exp => e.number === exp.number || e.name.toLowerCase() === exp.name.toLowerCase()),
    )
    const extra = existingAttrs.filter(
      e => !exportedAttrs.some(exp => e.number === exp.number || e.name.toLowerCase() === exp.name.toLowerCase()),
    )
    const toCreate = exportedAttrs.filter(e => !exists(e))

    // Preview attributes
    console.log('\n📋 Attributes:')
    console.log(`   📌 Match (preserved): ${toKeep.length}`)
    console.log(`   📋 Extra (preserved): ${extra.length}`)
    console.log(`   ➕ To create: ${toCreate.length}`)

    if (toCreate.length > 0) {
      console.log('\n✨ Will create:')
      for (const a of toCreate.slice(0, 5)) {
        console.log(`   - ${a.name} (${a.number})`)
      }
      if (toCreate.length > 5) console.log(`   ... and ${toCreate.length - 5} more`)
    }

    // Check groups
    const uniqueGroups = [
      ...new Map(exportedAttrs.map(a => [a.groupNumber, { name: a.groupName, number: a.groupNumber }])).values(),
    ]

    let existingGroups: Array<{ number: string; name: string }> = []
    try {
      const groups = await bluestoneClient.getAttributeGroups()
      if (Array.isArray(groups)) existingGroups = groups as typeof existingGroups
    } catch {
      /* ignore */
    }

    const existingGroupNums = new Set(existingGroups.map(g => g.number))
    const existingGroupNames = new Set(existingGroups.map(g => g.name.toLowerCase()))
    const groupsToCreate = uniqueGroups.filter(
      g => !existingGroupNums.has(g.number) && !existingGroupNames.has(g.name.toLowerCase()),
    )

    console.log('\n🏷️  Groups:')
    console.log(`   ✓ Existing: ${uniqueGroups.length - groupsToCreate.length}`)
    if (groupsToCreate.length > 0) {
      console.log(`   ➕ To create: ${groupsToCreate.length}`)
      for (const g of groupsToCreate) {
        console.log(`      - ${g.name} (${g.number})`)
      }
    }

    const proceed = await confirm({
      message: '\nProceed with import?',
      default: false,
    })

    if (!proceed) {
      console.log('\n❌ Cancelled')
      return { success: false, message: 'Cancelled' }
    }

    console.log('\n🚀 Importing...')

    const result = await executeCompleteImport(exportedAttrs, existingAttrs, true)

    // Summary
    console.log('\n📊 Results:')
    if (result.success) {
      console.log('   ✅ Success')
      if (result.createdGroups.length) console.log(`   🏷️  Groups: ${result.createdGroups.length}`)
      if (result.createdAttributes.length) console.log(`   ➕ Created: ${result.createdAttributes.length}`)
      if (result.preservedAttributes.length) console.log(`   📋 Preserved: ${result.preservedAttributes.length}`)
    } else {
      console.log('   ❌ Failed')
      for (const e of result.errors) {
        console.log(`   ✗ ${e}`)
      }
    }

    return result
  } catch (error) {
    console.error('\n💥 Error:', error)
    return { success: false, error: String(error) }
  }
}

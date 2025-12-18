import { getAllCustomTypes } from '../../utils/commercetools/get-all-custom-types'

export default async () => {
  try {
    console.log('\n🔷 CommerceTools Custom Types Export')
    console.log('=====================================\n')

    const types = await getAllCustomTypes()

    console.log(`✅ Exported ${types.length} custom types`)

    if (types.length > 0) {
      for (const t of types.slice(0, 10)) {
        console.log(`   ✓ ${t.name?.en || t.key} (${t.fieldDefinitions?.length || 0} fields)`)
      }
      if (types.length > 10) console.log(`   ... and ${types.length - 10} more`)
    }

    console.log('\n💾 Saved to: outputs/commercetools/export-custom-types.json')

    return types
  } catch (error) {
    console.error('\n💥 Export failed:', error)
    return { success: false, error: String(error), data: [] }
  }
}

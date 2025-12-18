import { bluestoneClient } from '../../clients/bluestone'

export default async () => {
  try {
    console.log('\n🔷 Bluestone Attributes Export')
    console.log('==============================\n')

    const attributes = await bluestoneClient.getAttributes()

    console.log(`✅ Exported ${attributes.length} attributes`)

    // Show sample (first 10)
    if (attributes.length > 0) {
      console.log('\n📋 Sample:')
      for (const a of (attributes as Array<{ name?: string }>).slice(0, 10)) {
        console.log(`   - ${a.name}`)
      }
      if (attributes.length > 10) {
        console.log(`   ... and ${attributes.length - 10} more`)
      }
    }

    console.log('\n💾 Saved to: outputs/bluestone/export-attributes.json')

    // Return without logging full content
    return { __skipLog: true, data: attributes }
  } catch (error) {
    console.error('\n💥 Export failed:', error)
    return null
  }
}

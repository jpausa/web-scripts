import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { select } from '@inquirer/prompts'
import { deepReadDir } from './utils'

const bootstrap = async () => {
  const basePath = join(__dirname, '/scripts/')

  const scriptPaths: string[] = (await deepReadDir(basePath)).flat(Number.POSITIVE_INFINITY)
  const sanitizedScripts = scriptPaths.map(script => script.replace(basePath, ''))
  const services = new Set(sanitizedScripts.map(script => script.split('/')[0]))

  const service = await select({
    message: 'Select the service you want to use',
    choices: [...services].map(service => ({
      name: service,
      value: service,
    })),
  })

  const availableScripts = sanitizedScripts.filter(script => script.includes(service))
  const availableScriptsNoExt = availableScripts.map(script => script.split('.ts')[0].split(`${service}/`)[1])

  const script = await select({
    message: 'Select the script you want to run',
    choices: availableScriptsNoExt.map(script => ({
      name: script,
      value: script,
    })),
  })

  const scriptPath = scriptPaths.find(scriptPath => scriptPath.includes(script))

  try {
    const scriptFunction = await import(`${scriptPath}`)
    const result = await scriptFunction.default()

    if (typeof result !== 'undefined' && result !== null) {
      const dataToSave = result.__skipLog && result.data !== undefined ? result.data : result

      if (!result.__skipLog) {
        const isLargeArray = Array.isArray(result) && result.length > 20
        if (isLargeArray) {
          console.log(`\n📦 Result: ${result.length} items`)
        } else {
          console.log(result)
        }
      }

      const path = `./src/outputs/${service}/${script}.json`
      const folderPath = path.split('/').slice(0, -1).join('/')

      if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true })

      try {
        writeFileSync(path, JSON.stringify(dataToSave, null, 2))
        console.log(`\n✅ Saved: ${path}`)
      } catch (err) {
        console.error('\n❌ Failed to save:', err)
      }
    }

    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
bootstrap()

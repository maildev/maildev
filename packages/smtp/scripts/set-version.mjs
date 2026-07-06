// Rewrites the VERSION constant in the built dist/index.js to match the
// version in package.json. Run automatically after `tsc` as part of `build`.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))

const pkg = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
const target = join(packageRoot, 'dist', 'index.js')

const source = await readFile(target, 'utf8')
const pattern = /(export const VERSION = )'[^']*'/

if (!pattern.test(source)) {
  throw new Error(`Could not find the VERSION constant to update in ${target}`)
}

await writeFile(target, source.replace(pattern, `$1'${pkg.version}'`))
console.log(`Set ${pkg.name} VERSION to ${pkg.version} in dist/index.js`)

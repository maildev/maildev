const fs = require('fs')
const path = require('path')
const { options } = require('../lib/options')

const generateMarkdown = (options) => {
  const tableRows = options.map((option) => {
    const env = option[1] ? `\`${option[1] || ''}\`` : ''
    return `|\`${option[0]}\`|${env}|${option[2] || ''}|`
  })
  return [
    `|Options|Environment variable|Description|`,
    `|---|---|---|`
  ].concat(tableRows).join('\n')
}

const readmeFilename = path.join(__dirname, '../README.md')
const README = fs.readFileSync(readmeFilename).toString()

const updatedText = `
\`\`\`
Usage: maildev [options]
\`\`\`

${generateMarkdown(options)}
`

const updatedREADME = README.replace(/(## Usage)(.|\n)+(\n## API)/, `$1${updatedText}$3`)

fs.writeFileSync(readmeFilename, updatedREADME)

console.log(`Successfully updated ${readmeFilename}`)

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : null
const revision = process.argv[3] ?? "unknown"

if (!sourceRoot) {
  console.error("Usage: node scripts/sync-material-icon-theme.mjs <upstream-repository> [revision]")
  process.exit(1)
}

const manifestPath = path.join(sourceRoot, "dist", "material-icons.json")
const packagePath = path.join(sourceRoot, "package.json")
const licensePath = path.join(sourceRoot, "LICENSE")
const outputAssets = path.join(projectRoot, "public", "material-file-icons")
const outputManifest = path.join(projectRoot, "src", "generated", "material-file-icons.json")

const [manifest, packageJson, license] = await Promise.all([
  readFile(manifestPath, "utf8").then(JSON.parse),
  readFile(packagePath, "utf8").then(JSON.parse),
  readFile(licensePath, "utf8"),
])

const darkExtensions = manifest.fileExtensions ?? {}
const darkNames = manifest.fileNames ?? {}
const lightExtensions = manifest.light?.fileExtensions ?? {}
const lightNames = manifest.light?.fileNames ?? {}
const usedIconIds = new Set([
  manifest.file,
  manifest.folder,
  ...Object.values(darkExtensions),
  ...Object.values(darkNames),
  ...Object.values(lightExtensions),
  ...Object.values(lightNames),
])

const icons = {}
for (const iconId of [...usedIconIds].sort()) {
  const iconPath = manifest.iconDefinitions?.[iconId]?.iconPath
  if (!iconPath) {
    throw new Error(`Missing icon definition for ${iconId}`)
  }
  icons[iconId] = path.basename(iconPath)
}

const assetDirectory = `v${packageJson.version}`
const outputVersionAssets = path.join(outputAssets, assetDirectory)

const generated = {
  source: {
    repository: "https://github.com/material-extensions/vscode-material-icon-theme",
    version: packageJson.version,
    revision,
  },
  assetDirectory,
  defaultFile: manifest.file,
  defaultFolder: manifest.folder,
  icons,
  fileExtensions: darkExtensions,
  fileNames: darkNames,
  light: {
    fileExtensions: lightExtensions,
    fileNames: lightNames,
  },
}

await rm(outputAssets, { recursive: true, force: true })
await mkdir(outputVersionAssets, { recursive: true })
await mkdir(path.dirname(outputManifest), { recursive: true })

for (const [iconId, fileName] of Object.entries(icons)) {
  const upstreamPath = path.resolve(
    path.dirname(manifestPath),
    manifest.iconDefinitions[iconId].iconPath,
  )
  await cp(upstreamPath, path.join(outputVersionAssets, fileName))
}

const sourceNotice = `# Material Icon Theme assets

These SVG assets are sourced from
https://github.com/material-extensions/vscode-material-icon-theme.

- Version: ${packageJson.version}
- Revision: ${revision}
- License: MIT (see LICENSE)

Only file-associated icons, the default file icon, and the default folder icon are
vendored. Run this sync script against a built upstream checkout to update them.
`

await Promise.all([
  writeFile(outputManifest, `${JSON.stringify(generated, null, 2)}\n`),
  writeFile(path.join(outputAssets, "LICENSE"), license),
  writeFile(path.join(outputAssets, "SOURCE.md"), sourceNotice),
])

console.log(
  `Synced ${Object.keys(icons).length} icons, ${Object.keys(darkExtensions).length} extensions, and ${Object.keys(darkNames).length} filenames.`,
)

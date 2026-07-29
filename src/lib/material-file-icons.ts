import manifest from "@/generated/material-file-icons.json"

type AssociationMap = Record<string, string>

type MaterialIconPair = {
  dark: string
  light: string
}

const iconFiles = manifest.icons as AssociationMap
const darkExtensions = manifest.fileExtensions as AssociationMap
const darkFileNames = manifest.fileNames as AssociationMap
const lightExtensions = manifest.light.fileExtensions as AssociationMap
const lightFileNames = manifest.light.fileNames as AssociationMap

function lowerCaseIndex(associations: AssociationMap) {
  return Object.fromEntries(
    Object.entries(associations).map(([key, icon]) => [key.toLowerCase(), icon]),
  )
}

const darkFileNamesLower = lowerCaseIndex(darkFileNames)
const lightFileNamesLower = lowerCaseIndex(lightFileNames)
const baseUrl = import.meta.env?.BASE_URL ?? "/"
const assetRoot = `${baseUrl}material-file-icons/${manifest.assetDirectory}/`

function normalizedName(name: string) {
  return name.replaceAll("\\", "/")
}

function fileNameCandidates(name: string) {
  const normalized = normalizedName(name)
  const basename = normalized.split("/").pop() ?? normalized
  return normalized === basename ? [basename] : [normalized, basename]
}

function extensionCandidates(name: string, providedExtension?: string) {
  const basename = normalizedName(name).split("/").pop()?.toLowerCase() ?? ""
  const candidates: string[] = []

  for (let index = basename.indexOf("."); index >= 0; index = basename.indexOf(".", index + 1)) {
    const suffix = basename.slice(index + 1)
    if (suffix) candidates.push(suffix)
  }

  const provided = providedExtension?.replace(/^\.+/, "").toLowerCase()
  if (provided && !candidates.includes(provided)) candidates.push(provided)

  return candidates
}

function iconForFileName(
  candidates: string[],
  exact: AssociationMap,
  lower: AssociationMap,
) {
  for (const candidate of candidates) {
    const icon = exact[candidate] ?? lower[candidate.toLowerCase()]
    if (icon) return icon
  }
}

function iconForExtension(candidates: string[], associations: AssociationMap) {
  for (const candidate of candidates) {
    const icon = associations[candidate]
    if (icon) return icon
  }
}

function iconUrl(iconId: string) {
  const fileName = iconFiles[iconId] ?? iconFiles[manifest.defaultFile]
  return `${assetRoot}${encodeURIComponent(fileName)}`
}

export function resolveMaterialFileIcon(
  name: string,
  kind: "file" | "folder",
  providedExtension?: string,
): MaterialIconPair {
  if (kind === "folder") {
    const folder = iconUrl(manifest.defaultFolder)
    return { dark: folder, light: folder }
  }

  const names = fileNameCandidates(name)
  const extensions = extensionCandidates(name, providedExtension)
  const darkIcon =
    iconForFileName(names, darkFileNames, darkFileNamesLower) ??
    iconForExtension(extensions, darkExtensions) ??
    manifest.defaultFile
  const lightIcon =
    iconForFileName(names, lightFileNames, lightFileNamesLower) ??
    iconForExtension(extensions, lightExtensions) ??
    darkIcon

  return {
    dark: iconUrl(darkIcon),
    light: iconUrl(lightIcon),
  }
}

export const materialIconCoverage = {
  version: manifest.source.version,
  revision: manifest.source.revision,
  extensions: Object.keys(darkExtensions).length,
  fileNames: Object.keys(darkFileNames).length,
  icons: Object.keys(iconFiles).length,
} as const

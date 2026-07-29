import { type FileNode } from "@/lib/models"
import { resolveMaterialFileIcon } from "@/lib/material-file-icons"

type FileGlyphItem = Pick<FileNode, "kind"> & Partial<FileNode>

export function FileGlyph({ item, size = 20 }: { item: FileGlyphItem; size?: number }) {
  const icon = resolveMaterialFileIcon(item.name ?? "", item.kind, item.ext)
  const hasLightVariant = icon.light !== icon.dark

  return (
    <span
      className="relative inline-flex shrink-0 select-none items-center justify-center align-middle"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={icon.light}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className={hasLightVariant ? "block size-full dark:hidden" : "block size-full"}
      />
      {hasLightVariant ? (
        <img
          src={icon.dark}
          alt=""
          width={size}
          height={size}
          draggable={false}
          className="hidden size-full dark:block"
        />
      ) : null}
    </span>
  )
}

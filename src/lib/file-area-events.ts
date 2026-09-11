export const CREATE_FOLDER_EVENT = "cloudrave:create-folder"

export function requestInlineFolderCreate(parentId: string | null) {
  window.dispatchEvent(new CustomEvent(CREATE_FOLDER_EVENT, { detail: { parentId } }))
}

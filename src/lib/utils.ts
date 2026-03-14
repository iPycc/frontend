import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function truncateFilename(filename: string, maxLength: number) {
  if (filename.length <= maxLength) return filename
  const parts = filename.split('.')
  if (parts.length > 1) {
    const ext = parts.pop() || ""
    const name = parts.join('.')
    if (name.length <= maxLength - ext.length - 3) return filename
    return `${name.slice(0, maxLength - ext.length - 3)}.....${ext}`
  }
  return `${filename.slice(0, maxLength - 5)}.....`
}
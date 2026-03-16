import { IconSearch } from "@tabler/icons-react"

export function SearchBar() {
  return (
    <div className="hidden h-11 min-w-0 max-w-[420px] flex-1 items-center rounded-[10px] border border-[#d6d6d6] bg-white px-4 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] md:flex dark:border-white/10 dark:bg-[#171717] dark:shadow-none">
      <IconSearch
        className="shrink-0 text-[#4b4b4b] dark:text-[#b8b8b8]"
        size={20}
      />
      <input
        type="text"
        placeholder="按下 Ctrl K 进行检索..."
        className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-[#333333] outline-none placeholder:text-[#8a8a8a] dark:text-[#efefef] dark:placeholder:text-[#8e8e8e]"
      />
      <div className="flex shrink-0 items-center gap-1 text-[11px] text-[#8a8a8a] dark:text-[#8e8e8e]">
        <span className="rounded-md border border-[#d4d4d4] bg-[#f4f4f4] px-1.5 py-0.5 dark:border-white/10 dark:bg-[#232323]">
          Ctrl
        </span>
        <span className="rounded-md border border-[#d4d4d4] bg-[#f4f4f4] px-1.5 py-0.5 dark:border-white/10 dark:bg-[#232323]">
          K
        </span>
      </div>
    </div>
  )
}

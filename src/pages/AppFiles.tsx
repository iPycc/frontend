import { useState } from "react";
import { Toolbar } from "../components/Toolbar";
import { FileArea } from "../components/FileArea";

export function AppFiles() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  return (
    <>
      <Toolbar
        selectedCount={selectedIds.length}
        onClearSelection={handleClearSelection}
      />
      <FileArea 
        selectedIds={selectedIds} 
        onToggleSelect={handleToggleSelect} 
        onClearSelection={handleClearSelection}
      />
    </>
  );
}

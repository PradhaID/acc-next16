import * as XLSX from "xlsx";

export function downloadXLSX(
  sheets: { name: string; rows: any[] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const isAOA = Array.isArray(rows[0]);
    const ws = isAOA ? XLSX.utils.aoa_to_sheet(rows) : XLSX.utils.json_to_sheet(rows);

    if (rows.length > 0) {
      let maxCols = 0;
      if (isAOA) {
        maxCols = Math.max(...rows.map(r => (Array.isArray(r) ? r.length : 0)));
      } else {
        maxCols = Object.keys(rows[0]).length;
      }

      const colWidths = Array.from({ length: maxCols }, (_, colIdx) => {
        let maxLen = 10;
        for (const row of rows) {
          let val = null;
          if (isAOA) {
            val = Array.isArray(row) ? row[colIdx] : null;
          } else {
            const keys = Object.keys(row);
            val = row[keys[colIdx]];
          }
          if (val !== undefined && val !== null) {
            const strVal = String(val);
            if (strVal.length > maxLen) {
              maxLen = strVal.length;
            }
          }
        }
        return { wch: maxLen + 3 };
      });
      ws["!cols"] = colWidths;
    }

    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

import { useEffect, useRef } from 'react'
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDark,
  createGrid,
  themeQuartz,
} from 'ag-grid-community'

// ponytail: all community modules (~biggest chunk); register only the ones used if bundle size matters
ModuleRegistry.registerModules([AllCommunityModule])

// Dark "kiln" grid: transparent so the figure card shows through, warm-tinted lines and text,
// the brand amber for small accents (sort/filter indicators, focus, selection).
const theme = themeQuartz.withPart(colorSchemeDark).withParams({
  backgroundColor: 'transparent',
  foregroundColor: '#E9DFD5',
  headerBackgroundColor: 'transparent',
  headerTextColor: '#8E8277',
  headerFontWeight: 550,
  oddRowBackgroundColor: 'transparent',
  rowHoverColor: 'rgba(255, 236, 218, 0.03)',
  borderColor: 'rgba(255, 236, 218, 0.085)',
  wrapperBorder: false,
  accentColor: '#F88108',
  fontFamily: 'Figtree, ui-sans-serif, system-ui, sans-serif',
  fontSize: 14.5,
})

const SCROLL_AFTER = 10 // rows; bigger tables get a fixed height + scroll

export default function Grid({ columns, rows }) {
  const ref = useRef(null)
  const tall = rows.length > SCROLL_AFTER

  useEffect(() => {
    const api = createGrid(ref.current, {
      theme,
      columnDefs: columns.map((headerName, i) => ({ headerName, field: String(i) })),
      rowData: rows.map((r) => ({ ...r })), // ['a', 1] → { 0: 'a', 1: 1 }
      defaultColDef: { sortable: true, filter: true, flex: 1, minWidth: 100 },
      domLayout: tall ? 'normal' : 'autoHeight',
    })
    return () => api.destroy()
  }, [columns, rows, tall])

  return <div ref={ref} className="grid" style={{ height: tall ? 400 : undefined }} />
}

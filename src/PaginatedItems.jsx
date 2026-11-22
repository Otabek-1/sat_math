import { useState } from 'react'

export default function PaginatedItems({ items, render, pageSize = 10 }) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * pageSize
  const visibleItems = items.slice(start, start + pageSize)

  return (
    <div>
      {render(visibleItems, start)}
      {pageCount > 1 && (
        <nav aria-label="Ro‘yxat sahifalari" className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
          <span className="text-slate-500">{start + 1}–{Math.min(start + pageSize, items.length)} / {items.length}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg border px-3 py-1.5 disabled:opacity-40" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Oldingi</button>
            <span aria-live="polite" className="min-w-16 text-center">{currentPage} / {pageCount}</span>
            <button type="button" className="rounded-lg border px-3 py-1.5 disabled:opacity-40" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Keyingi</button>
          </div>
        </nav>
      )}
    </div>
  )
}

export function PaginationControls({ total, page, pageSize = 10, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (pageCount <= 1) return null
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * pageSize

  return (
    <nav aria-label="Ro‘yxat sahifalari" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
      <span className="text-slate-500">{start + 1}–{Math.min(start + pageSize, total)} / {total}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-lg border px-3 py-1.5 disabled:opacity-40" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Oldingi</button>
        <span aria-live="polite" className="min-w-16 text-center">{currentPage} / {pageCount}</span>
        <button type="button" className="rounded-lg border px-3 py-1.5 disabled:opacity-40" disabled={currentPage >= pageCount} onClick={() => onPageChange(currentPage + 1)}>Keyingi</button>
      </div>
    </nav>
  )
}

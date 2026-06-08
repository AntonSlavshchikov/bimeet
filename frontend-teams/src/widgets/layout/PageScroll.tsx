import type { ReactNode } from 'react'

// PageScroll is the standard scroll + centred padding container for non
// master-detail screens (notifications, team, settings, event form) that live
// directly inside the rail shell's main area.
export default function PageScroll({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[760px] mx-auto px-8 py-7">{children}</div>
    </div>
  )
}

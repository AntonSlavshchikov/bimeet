import { CalendarClock } from 'lucide-react'

// EmptyDetail fills the detail panel on «/» when there is no meeting to open
// (e.g. the selected day has no meetings). When meetings exist, MeetingsLayout
// auto-redirects to one, so this is the genuine empty state.
export default function EmptyDetail() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-ink-3 px-8">
      <CalendarClock size={34} className="opacity-40 mb-3" />
      <p className="text-[14px] font-medium text-ink-2">Выберите встречу</p>
      <p className="text-[13px] mt-1">Слева — встречи на выбранный день. Откройте любую, чтобы увидеть детали.</p>
    </div>
  )
}

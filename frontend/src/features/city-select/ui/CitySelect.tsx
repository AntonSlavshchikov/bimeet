import { useState } from 'react'
import { Check, ChevronsUpDown, MapPin } from 'lucide-react'
import { Command } from 'cmdk'
import { useTranslation } from 'react-i18next'
import { useCities } from '@/entities/city/queries'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import type { City } from '@/shared/api/types/city'

interface CitySelectProps {
  value?: string
  onValueChange: (cityID: string) => void
  allowAll?: boolean
  className?: string
  disabled?: boolean
  currentCity?: City
}

export default function CitySelect({
  value,
  onValueChange,
  allowAll = false,
  className,
  disabled,
  currentCity,
}: CitySelectProps) {
  const { t } = useTranslation()
  const citiesQuery = useCities()
  const cities = citiesQuery.data ?? []
  const [open, setOpen] = useState(false)
  const selected = cities.find(city => city.id === value)
    ?? (currentCity?.id === value ? currentCity : undefined)
  const label = selected
    ? `${selected.name} — ${selected.region}`
    : allowAll
      ? t('cities.all', 'Все города')
      : t('cities.placeholder', 'Выберите город')

  function select(cityID: string) {
    onValueChange(cityID)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="soft"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('h-9 w-full justify-between px-3 font-medium', !selected && !allowAll && 'text-ink-3', className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin size={14} className="shrink-0 text-ink-3" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronsUpDown size={14} className="shrink-0 text-ink-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(420px,calc(100vw-32px))] p-0">
        <Command
          label={t('cities.commandLabel', 'Выбор города')}
          className="flex flex-col overflow-hidden rounded-[12px] bg-surface"
        >
          <Command.Input
            className="h-10 border-b border-line bg-transparent px-3 text-[13.5px] text-ink outline-none placeholder:text-ink-3"
            placeholder={t('cities.searchPlaceholder', 'Найти город или регион...')}
          />
          <Command.List
            label={t('cities.suggestionsLabel', 'Города')}
            className="max-h-[320px] overflow-y-auto p-1"
          >
            {citiesQuery.isPending ? (
              <div className="px-3 py-6 text-center text-[13px] text-ink-3">
                {t('cities.loading', 'Загрузка городов...')}
              </div>
            ) : citiesQuery.isError ? (
              <div className="flex flex-col items-center gap-2 px-3 py-6 text-center text-[13px] text-ink-3">
                <span>{t('cities.loadError', 'Не удалось загрузить города')}</span>
                <button
                  type="button"
                  className="font-semibold text-accent hover:underline"
                  onClick={() => citiesQuery.refetch()}
                >
                  {t('common.retry', 'Повторить')}
                </button>
              </div>
            ) : (
              <>
                <Command.Empty className="px-3 py-6 text-center text-[13px] text-ink-3">
                  {t('cities.notFound', 'Город не найден')}
                </Command.Empty>
                {allowAll && (
                  <Command.Item
                    value="all cities все города"
                    onSelect={() => select('')}
                    className="relative flex cursor-pointer select-none items-center rounded-[7px] py-2 pl-8 pr-3 text-[13.5px] outline-none data-[selected=true]:bg-hover"
                  >
                    {!value && <Check size={14} className="absolute left-2.5 text-accent" />}
                    {t('cities.all', 'Все города')}
                  </Command.Item>
                )}
                {cities.map(city => (
                  <Command.Item
                    key={city.id}
                    value={`${city.name} ${city.region} ${city.id}`}
                    onSelect={() => select(city.id)}
                    className="relative flex cursor-pointer select-none items-center rounded-[7px] py-2 pl-8 pr-3 text-[13.5px] outline-none data-[selected=true]:bg-hover"
                  >
                    {city.id === value && <Check size={14} className="absolute left-2.5 text-accent" />}
                    <span className="truncate">
                      <span className="font-medium text-ink">{city.name}</span>
                      <span className="text-ink-3"> — {city.region}</span>
                    </span>
                  </Command.Item>
                ))}
              </>
            )}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

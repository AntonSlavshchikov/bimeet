import { useState } from 'react'
import { Calendar, MapPin, Plus, Bell, MessageCircle, Moon, Sun, Users } from 'lucide-react'
import { useTheme } from '@/shared/theme'
import {
  Avatar,
  AvatarStack,
  Button,
  DateCell,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  EventSectionNav,
  EventTag,
  Input,
  Kbd,
  ListGroup,
  ListRow,
  MiniCalendar,
  PageHeader,
  RailCard,
  RailCardTitle,
  SearchInput,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  StatCell,
  StatusPill,
  StatusPillButton,
  Textarea,
  TimeCell,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui'

const eventDates = new Set([
  '2026-05-26', '2026-05-30',
  '2026-06-08', '2026-06-12', '2026-06-14', '2026-06-16', '2026-06-22', '2026-06-28', '2026-06-30',
])

export default function DesignSystemPage() {
  const [tab, setTab] = useState<'all' | 'going' | 'host' | 'past'>('all')
  const [section, setSection] = useState<'people' | 'chat'>('people')
  const [theme, setTheme] = useTheme()

  return (
    <TooltipProvider>
    <div className="w-full text-ink">

      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-2">
            Bimeet · Design System Preview
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.035em]">Warm Canvas · UI stand</h1>
          <p className="text-[13.5px] text-ink-3 mt-1.5">
            Эталон: <code className="text-[12.5px] bg-bg-2 px-1.5 py-0.5 rounded">design/new-front.html · 01 Warm Canvas</code>
          </p>
        </div>
        <Button variant="outline" size="icon" aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">

        <div className="flex flex-col gap-12 min-w-0">

          {/* Section: Buttons */}
          <Section title="Buttons & Inputs">
            <div className="flex flex-wrap gap-2 items-center">
              <Button>Primary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="icon" size="icon"><Bell size={16} /></Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <Input placeholder="Обычный инпут" />
              <Input placeholder="Disabled" disabled />
              <Textarea placeholder="Многострочный..." className="col-span-2" />
              <Select>
                <SelectTrigger><SelectValue placeholder="Выберите категорию"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordinary">Личная</SelectItem>
                  <SelectItem value="business">Деловая</SelectItem>
                </SelectContent>
              </Select>
              <SearchInput kbdHint="⌘K" placeholder="Найти встречу, место..." />
            </div>
          </Section>

          {/* Section: Pills / Tags */}
          <Section title="Status pills · Event tags">
            <div className="flex flex-wrap gap-2 items-center">
              <StatusPill variant="going">Иду</StatusPill>
              <StatusPill variant="host">Хост</StatusPill>
              <StatusPill variant="completed">Завершена</StatusPill>
              <StatusPillButton variant="action">Иду</StatusPillButton>
              <StatusPillButton variant="invited">Подтвердить</StatusPillButton>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <EventTag>Личная</EventTag>
              <EventTag variant="public">Публичная</EventTag>
              <EventTag variant="work">Деловая</EventTag>
              <EventTag variant="host">Black tie</EventTag>
            </div>
          </Section>

          {/* Section: Avatars */}
          <Section title="Avatars">
            <div className="flex gap-3 items-center">
              <Avatar name="Антон Славщиков" size="xs" />
              <Avatar name="Антон Славщиков" size="sm" />
              <Avatar name="Антон Славщиков" size="md" />
              <Avatar name="Антон Славщиков" size="lg" />
              <Avatar name="Антон Славщиков" size="xl" />
            </div>
            <AvatarStack max={4}>
              {['Аня Петрова','Миша Кравцов','Ира Воронова','Сергей Васильев','Кирилл Сёмин','Маша Долгова'].map(n => (
                <Avatar key={n} name={n} size="sm" />
              ))}
            </AvatarStack>
          </Section>

          {/* Section: Segmented control */}
          <Section title="Segmented control">
            <SegmentedControl
              value={tab}
              onChange={setTab}
              options={[
                { value: 'all', label: 'Все', count: 8 },
                { value: 'going', label: 'Иду', count: 5 },
                { value: 'host', label: 'Организую', count: 3 },
                { value: 'past', label: 'Архив', count: 12 },
              ]}
            />
            <SegmentedControl
              fullWidth
              value={tab}
              onChange={setTab}
              options={[
                { value: 'all', label: 'Все' },
                { value: 'going', label: 'Иду' },
                { value: 'host', label: 'Хост' },
                { value: 'past', label: 'Архив' },
              ]}
            />
          </Section>

          <Section title="Page header · Quiet Rail · Empty state">
            <PageHeader
              eyebrow="12 июня · среда"
              title="День рождения Ани"
              subtitle="Все детали встречи собраны в одном спокойном пространстве"
              actions={<Button size="sm"><Plus size={14} />Создать</Button>}
            />
            <EventSectionNav
              label="Разделы встречи"
              value={section}
              onChange={setSection}
              options={[
                { key: 'people', label: 'Участники', icon: Users },
                { key: 'chat', label: 'Чат', icon: MessageCircle, badge: 3 },
              ]}
            />
            <EmptyState icon={Calendar} title="Пока ничего нет" description="Добавленные элементы появятся здесь единым списком." action={<Button size="sm">Добавить</Button>} />
          </Section>

          {/* Section: List + Row */}
          <Section title="ListGroup · ListRow">
            <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-3 pb-2 px-1">
              Июнь · 4 встречи
            </div>
            <ListGroup>
              <ListRow accent="red" href="#">
                <Row
                  date={<DateCell day={12} caption="ср" />}
                  title="День рождения Ани · 28 лет"
                  desc="Quartier Latin, второй этаж · сбор 1 500 ₽"
                  time={<TimeCell time="19:00" place="Покровка 17" />}
                  avatars={['АП', 'КС', 'МД']}
                  more={9}
                  action={<StatusPill variant="going">Иду</StatusPill>}
                />
              </ListRow>
              <ListRow accent="gray" href="#">
                <Row
                  date={<DateCell day={14} caption="пт" />}
                  title="Карпулинг в Шереметьево"
                  desc="Рейс в 9:30 · сбор у Сокола в 5:45"
                  time={<TimeCell time="06:00" place="м. Сокол" />}
                  tags={[{ label: 'Деловая', variant: 'work' as const }]}
                  avatars={['ИВ', 'ВС', 'ТР']}
                  more={1}
                  action={<StatusPill variant="going">Иду</StatusPill>}
                />
              </ListRow>
              <ListRow accent="orange" href="#">
                <Row
                  date={<DateCell day={16} caption="вс" />}
                  title="Пикник в Парке Горького"
                  desc="Поляна у фонтана · приходите с пледом"
                  time={<TimeCell time="14:00" place="ЦПКиО" />}
                  tags={[{ label: 'Публичная', variant: 'public' as const }]}
                  avatars={['ОЛ', 'ПК', 'НМ']}
                  more={21}
                  action={<StatusPillButton variant="action">Иду</StatusPillButton>}
                />
              </ListRow>
              <ListRow accent="green" href="#">
                <Row
                  date={<DateCell day={28} caption="пт" />}
                  title="Поход на Хибины · 3 дня"
                  desc="Кировск · треккинг + дождевик"
                  time={<TimeCell time="09:00" place="Кировск" />}
                  avatars={['КС', 'МД', 'АП']}
                  more={3}
                  action={<StatusPill variant="host">Хост</StatusPill>}
                />
              </ListRow>
            </ListGroup>
          </Section>

          {/* Section: Dialog & Dropdown */}
          <Section title="Dialog · DropdownMenu · Tooltip">
            <div className="flex gap-2 items-center">
              <Dialog>
                <DialogTrigger asChild><Button variant="outline">Открыть диалог</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Удалить встречу?</DialogTitle>
                    <DialogDescription>Это действие нельзя отменить. Все участники получат уведомление.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="ghost">Отмена</Button>
                    <Button variant="danger">Удалить</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost">Меню организатора</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Действия</DropdownMenuLabel>
                  <DropdownMenuItem>Редактировать</DropdownMenuItem>
                  <DropdownMenuItem>Поделиться ссылкой</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Завершить</DropdownMenuItem>
                  <DropdownMenuItem destructive>Удалить</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="icon" size="icon"><Bell size={16} /></Button>
                </TooltipTrigger>
                <TooltipContent>3 непрочитанных уведомления</TooltipContent>
              </Tooltip>
            </div>
          </Section>

          {/* Section: Kbd & Separator */}
          <Section title="Прочее">
            <div className="flex gap-2 items-center">
              <Kbd>⌘K</Kbd>
              <Kbd>⌘ ↵</Kbd>
              <Kbd>Esc</Kbd>
            </div>
            <Separator />
            <div className="text-[13.5px] text-ink-3">— разделитель сверху —</div>
          </Section>

        </div>

        {/* Right rail demo */}
        <div className="flex flex-col gap-5">
          <RailCard>
            <RailCardTitle>Сегодня</RailCardTitle>
            <div className="text-[44px] font-bold tracking-[-0.03em] leading-none">26</div>
            <div className="text-[13px] text-ink-3 mt-1 mb-4">понедельник, 26 мая</div>
            <div className="border-t border-line-soft pt-2.5 flex gap-2.5 items-start">
              <div className="text-[12px] font-semibold w-10 text-ink-2 tnum pt-0.5">19:00</div>
              <div>
                <div className="text-[13.5px] font-medium text-ink">Встреча с дизайнером</div>
                <div className="text-[12px] text-ink-3 mt-0.5">Bimeet · 3 участника</div>
              </div>
            </div>
          </RailCard>

          <RailCard>
            <MiniCalendar eventDates={eventDates} />
          </RailCard>

          <RailCard>
            <RailCardTitle>Этот месяц</RailCardTitle>
            <div className="grid grid-cols-2 gap-3">
              <StatCell value={6} label="встреч впереди" />
              <StatCell value={2} label="организуете" />
              <StatCell value="4 000 ₽" label="в сборах" />
              <StatCell value={31} label="человек рядом" />
            </div>
          </RailCard>
        </div>
      </div>

      <div className="mt-16 flex items-center gap-3 text-[12.5px] text-ink-3">
        <Plus size={14} /> <Calendar size={14} /> <MapPin size={14} />
        <span>Иконки — <code className="bg-bg-2 px-1.5 py-0.5 rounded">lucide-react</code>, strokeWidth 2.</span>
      </div>
    </div>
    </TooltipProvider>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

interface RowProps {
  date: React.ReactNode
  title: string
  desc?: string
  tags?: { label: string; variant?: 'default' | 'public' | 'work' | 'host' }[]
  time?: React.ReactNode
  avatars?: string[]
  more?: number
  action?: React.ReactNode
}

function Row({ date, title, desc, tags, time, avatars, more, action }: RowProps) {
  return (
    <div className="grid grid-cols-[64px_minmax(220px,1fr)_160px_120px_130px_16px] gap-4 items-center py-3.5 pr-4 w-full">
      <div className="flex justify-center">{date}</div>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink truncate">{title}</span>
          {tags?.map(t => <EventTag key={t.label} variant={t.variant}>{t.label}</EventTag>)}
        </div>
        {desc && <div className="text-[12.5px] text-ink-3 truncate">{desc}</div>}
      </div>
      <div>{time}</div>
      <div className="flex items-center gap-2">
        {avatars && (
          <AvatarStack>
            {avatars.map(a => <Avatar key={a} name={a} size="sm" />)}
          </AvatarStack>
        )}
        {more != null && <span className="text-[12px] text-ink-3 tnum">+{more}</span>}
      </div>
      <div className="flex justify-end">{action}</div>
      <div className="text-ink-4 text-[14px] text-right pr-1">›</div>
    </div>
  )
}

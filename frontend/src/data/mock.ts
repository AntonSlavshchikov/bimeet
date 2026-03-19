import type { Event, User } from '../types'

export const currentUser: User = {
  id: 'u1',
  name: 'Андрей Смирнов',
  email: 'andrey@example.com',
}

export const allUsers: User[] = [
  currentUser,
  { id: 'u2', name: 'Игорь Петров', email: 'igor@example.com' },
  { id: 'u3', name: 'Катя Иванова', email: 'katya@example.com' },
  { id: 'u4', name: 'Дима Козлов', email: 'dima@example.com' },
  { id: 'u5', name: 'Алексей Новиков', email: 'alex@example.com' },
  { id: 'u6', name: 'Мария Соколова', email: 'maria@example.com' },
  { id: 'u7', name: 'Сергей Морозов', email: 'sergey@example.com' },
  { id: 'u8', name: 'Анна Волкова', email: 'anna@example.com' },
]

export const mockEvents: Event[] = [
  {
    id: 'e1',
    title: 'День рождения Андрея',
    description: 'Празднуем на природе. Будет мангал, игры и музыка.',
    dateStart: '2026-03-15T14:00:00',
    dateEnd: '2026-03-15T22:00:00',
    location: 'Коттедж "Лесная поляна"',
    organizer: currentUser,
    participants: [
      { id: 'p1', user: currentUser,  status: 'confirmed' },
      { id: 'p2', user: allUsers[1],  status: 'confirmed' },
      { id: 'p3', user: allUsers[2],  status: 'confirmed' },
      { id: 'p4', user: allUsers[3],  status: 'confirmed' },
      { id: 'p5', user: allUsers[4],  status: 'confirmed' },
      { id: 'p6', user: allUsers[5],  status: 'confirmed' },
      { id: 'p7', user: allUsers[6],  status: 'invited' },
      { id: 'p8', user: allUsers[7],  status: 'declined' },
    ],
    collections: [
      { id: 'col1', title: 'Аренда коттеджа',       targetAmount: 12000, createdBy: 'u1' },
      { id: 'col2', title: 'Продукты для мангала',   targetAmount: 4500,  createdBy: 'u1' },
      { id: 'col3', title: 'Напитки',                targetAmount: 3000,  createdBy: 'u1' },
      { id: 'col4', title: 'Торт',                   targetAmount: 2500,  createdBy: 'u1' },
    ],
    collectionContributions: {
      col1: [
        { userId: 'u1', paid: true,  paidAt: '2026-03-10T10:00:00' },
        { userId: 'u2', paid: true,  paidAt: '2026-03-11T12:00:00' },
        { userId: 'u3', paid: false },
        { userId: 'u4', paid: true,  paidAt: '2026-03-12T09:00:00' },
        { userId: 'u5', paid: false },
        { userId: 'u6', paid: false },
      ],
      col2: [
        { userId: 'u1', paid: true,  paidAt: '2026-03-10T10:00:00' },
        { userId: 'u2', paid: true,  paidAt: '2026-03-11T12:00:00' },
        { userId: 'u3', paid: true,  paidAt: '2026-03-13T15:00:00' },
        { userId: 'u4', paid: false },
        { userId: 'u5', paid: false },
        { userId: 'u6', paid: false },
      ],
      col3: [],
      col4: [],
    },
    polls: [
      {
        id: 'po1',
        question: 'Что приготовить на мангале?',
        createdBy: 'u1',
        options: [
          { id: 'opt1', label: 'Шашлык', votes: ['u1', 'u2', 'u4', 'u5'] },
          { id: 'opt2', label: 'Курица', votes: ['u3', 'u6'] },
          { id: 'opt3', label: 'Овощи',  votes: ['u3'] },
        ],
      },
    ],
    items: [
      { id: 'i1', name: 'Гитара',           assignedTo: allUsers[1] },
      { id: 'i2', name: 'Настольные игры',  assignedTo: allUsers[2] },
      { id: 'i3', name: 'Фотоаппарат',      assignedTo: allUsers[3] },
      { id: 'i4', name: 'Колонка',          assignedTo: undefined },
      { id: 'i5', name: 'Уголь для мангала',assignedTo: undefined },
    ],
    carpools: [
      {
        id: 'c1',
        driver: allUsers[4],
        seatsAvailable: 3,
        departurePoint: 'Москва, м. Лубянка',
        passengers: [allUsers[1]],
      },
      {
        id: 'c2',
        driver: allUsers[5],
        seatsAvailable: 2,
        departurePoint: 'Химки, ТЦ Мега',
        passengers: [],
      },
    ],
    changeLog: [
      {
        id: 'cl1',
        changedBy: currentUser,
        fieldName: 'Время начала',
        oldValue: '14:00',
        newValue: '15:00',
        changedAt: '2026-03-08T11:00:00',
      },
    ],
    createdAt: '2026-03-01T09:00:00',
  },
  {
    id: 'e2',
    title: 'Корпоратив команды',
    description: 'Ежеквартальная встреча команды. Подведение итогов и планы на следующий квартал.',
    dateStart: '2026-04-01T18:00:00',
    dateEnd: '2026-04-01T23:00:00',
    location: 'Ресторан "Панорама"',
    organizer: allUsers[6],
    participants: [
      { id: 'p9',  user: currentUser, status: 'confirmed' },
      { id: 'p10', user: allUsers[6], status: 'confirmed' },
      { id: 'p11', user: allUsers[7], status: 'invited' },
    ],
    collections: [
      { id: 'col5', title: 'Бронирование зала', targetAmount: 8000,  createdBy: 'u7' },
      { id: 'col6', title: 'Еда и напитки',     targetAmount: 15000, createdBy: 'u7' },
    ],
    collectionContributions: { col5: [], col6: [] },
    polls: [],
    items: [],
    carpools: [],
    changeLog: [],
    createdAt: '2026-03-05T14:00:00',
  },
  {
    id: 'e3',
    title: 'Поход в горы',
    description: 'Однодневный поход. Выход в 8 утра, возвращение вечером.',
    dateStart: '2026-05-09T08:00:00',
    dateEnd: '2026-05-09T20:00:00',
    location: 'Маршрут Красная Поляна — Роза Хутор',
    organizer: allUsers[4],
    participants: [
      { id: 'p12', user: currentUser, status: 'invited' },
      { id: 'p13', user: allUsers[4], status: 'confirmed' },
      { id: 'p14', user: allUsers[1], status: 'confirmed' },
    ],
    collections: [
      { id: 'col7', title: 'Транспорт',    targetAmount: 6000, createdBy: 'u5' },
      { id: 'col8', title: 'Еда в поход',  targetAmount: 3000, createdBy: 'u5' },
    ],
    collectionContributions: { col7: [], col8: [] },
    polls: [],
    items: [
      { id: 'i6', name: 'Аптечка', assignedTo: undefined },
      { id: 'i7', name: 'Горелка', assignedTo: allUsers[4] },
    ],
    carpools: [],
    changeLog: [],
    createdAt: '2026-03-10T10:00:00',
  },
]

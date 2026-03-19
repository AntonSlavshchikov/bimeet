import {
  VStack,
  HStack,
  Text,
  Button,
  Box,
  Grid,
  IconButton,
  Input,
  NumberInput,
  NumberInputField,
  FormControl,
  FormLabel,
  useDisclosure,
  Collapse,
  Avatar,
  Tooltip,
  Icon,
  Progress,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FiTrash2, FiPlus, FiCheck, FiDollarSign, FiUsers, FiTrendingUp } from 'react-icons/fi'
import type { Event } from '../../../types'
import { addExpense, removeExpense, toggleExpensePayment } from '../../../store/eventsStore'
import { useAuth } from '../../../context/AuthContext'

function StatCard({
  label,
  value,
  sub,
  bg,
  color,
  icon,
}: {
  label: string
  value: string
  sub?: string
  bg: string
  color: string
  icon: typeof FiDollarSign
}) {
  return (
    <Box p={3.5} borderRadius="xl" bg={bg} border="1px solid" borderColor="rgba(0,0,0,0.05)">
      <Icon as={icon} color={color} boxSize={4} mb={1.5} opacity={0.7} />
      <Text fontSize="xs" color="gray.500" fontWeight="500" mb={0.5}>{label}</Text>
      <Text fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.5px">{value}</Text>
      {sub && <Text fontSize="xs" color="gray.400" mt={0.5}>{sub}</Text>}
    </Box>
  )
}

export default function ExpensesTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { isOpen, onToggle } = useDisclosure()
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const isOrganizer = event.organizer.id === user?.id
  const confirmedParticipants = event.participants.filter(p => p.status === 'confirmed')
  const totalExpenses = event.expenses.reduce((s, e) => s + e.amount, 0)
  const perPerson = confirmedParticipants.length > 0
    ? Math.ceil(totalExpenses / confirmedParticipants.length)
    : 0

  const totalPaid = Object.values(event.expensePayments).flat().filter(p => p.paid).length
  const totalPayments = event.expenses.length * confirmedParticipants.length
  const collectedAmount = totalPayments > 0
    ? Math.round((totalPaid / totalPayments) * totalExpenses)
    : 0
  const collectedPct = totalExpenses > 0 ? Math.round((collectedAmount / totalExpenses) * 100) : 0

  function handleAdd() {
    if (!newTitle || !newAmount) return
    addExpense(event.id, { title: newTitle, amount: Number(newAmount) })
    setNewTitle('')
    setNewAmount('')
    onToggle()
  }

  return (
    <VStack align="stretch" spacing={5}>
      {/* Stat cards */}
      <Grid templateColumns="repeat(3, 1fr)" gap={2}>
        <StatCard
          label="Итого"
          value={`${totalExpenses.toLocaleString('ru-RU')} ₽`}
          bg="purple.50"
          color="purple.500"
          icon={FiDollarSign}
        />
        <StatCard
          label="С каждого"
          value={`${perPerson.toLocaleString('ru-RU')} ₽`}
          sub={`${confirmedParticipants.length} чел.`}
          bg="green.50"
          color="green.500"
          icon={FiUsers}
        />
        <StatCard
          label="Собрано"
          value={`${collectedPct}%`}
          sub={`${collectedAmount.toLocaleString('ru-RU')} ₽`}
          bg="blue.50"
          color="blue.500"
          icon={FiTrendingUp}
        />
      </Grid>

      {/* Progress */}
      {totalExpenses > 0 && (
        <Box>
          <HStack justify="space-between" mb={1.5}>
            <Text fontSize="xs" color="gray.400" fontWeight="500">Прогресс сбора</Text>
            <Text fontSize="xs" color="brand.600" fontWeight="600">{collectedPct}%</Text>
          </HStack>
          <Progress
            value={collectedPct}
            borderRadius="full"
            size="xs"
            colorScheme="purple"
          />
        </Box>
      )}

      {/* Header */}
      <HStack justify="space-between">
        <Text fontSize="xs" fontWeight="600" color="gray.400" textTransform="uppercase" letterSpacing="0.06em">
          Статьи расходов
        </Text>
        {isOrganizer && (
          <Button
            size="sm"
            leftIcon={<FiPlus />}
            colorScheme="blue"
            variant="outline"
            onClick={onToggle}
          >
            Добавить
          </Button>
        )}
      </HStack>

      {/* Add form */}
      <Collapse in={isOpen} animateOpacity>
        <Box p={4} borderRadius="xl" bg="gray.50" border="1px solid" borderColor="gray.100">
          <VStack spacing={3}>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="gray.500">Название</FormLabel>
              <Input
                size="sm"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Например: Аренда зала"
                bg="white"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="gray.500">Сумма (₽)</FormLabel>
              <NumberInput size="sm" value={newAmount} onChange={setNewAmount} min={1}>
                <NumberInputField bg="white" placeholder="0" />
              </NumberInput>
            </FormControl>
            <HStack w="full" justify="flex-end" spacing={2}>
              <Button size="sm" variant="ghost" onClick={onToggle}>Отмена</Button>
              <Button size="sm" colorScheme="blue" onClick={handleAdd}>Добавить</Button>
            </HStack>
          </VStack>
        </Box>
      </Collapse>

      {/* Empty state */}
      {event.expenses.length === 0 && (
        <Box textAlign="center" py={10}>
          <Icon as={FiDollarSign} boxSize={8} color="gray.200" mb={2} />
          <Text fontSize="sm" color="gray.400">Расходов пока нет</Text>
        </Box>
      )}

      {/* Expense rows */}
      <VStack align="stretch" spacing={2}>
        {event.expenses.map(expense => {
          const payments = event.expensePayments[expense.id] ?? []
          const paidCount = payments.filter(p => p.paid).length
          const myPayment = payments.find(p => p.userId === user?.id)
          const allPaid = paidCount === confirmedParticipants.length && confirmedParticipants.length > 0
          const shareAmount = confirmedParticipants.length > 0
            ? Math.ceil(expense.amount / confirmedParticipants.length)
            : 0

          return (
            <Box
              key={expense.id}
              p={4}
              borderRadius="xl"
              border="1px solid"
              borderColor={allPaid ? 'green.100' : 'gray.100'}
              bg={allPaid ? 'green.50' : 'white'}
              transition="all 0.2s"
            >
              {/* Title + controls */}
              <HStack justify="space-between" mb={2.5}>
                <Box minW={0} flex={1}>
                  <Text fontWeight="500" fontSize="sm" noOfLines={1}>{expense.title}</Text>
                  <Text fontSize="xs" color="gray.400" mt={0.5}>
                    {expense.amount.toLocaleString('ru-RU')} ₽ · по {shareAmount.toLocaleString('ru-RU')} ₽
                  </Text>
                </Box>
                <HStack spacing={2} flexShrink={0}>
                  <Box
                    px={2.5}
                    py={1}
                    borderRadius="md"
                    bg={allPaid ? 'green.100' : 'orange.50'}
                  >
                    <Text
                      fontSize="xs"
                      fontWeight="600"
                      color={allPaid ? 'green.600' : 'orange.500'}
                    >
                      {paidCount}/{confirmedParticipants.length}
                    </Text>
                  </Box>
                  {isOrganizer && (
                    <IconButton
                      aria-label="Удалить"
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => removeExpense(event.id, expense.id)}
                    />
                  )}
                </HStack>
              </HStack>

              {/* Participant avatars */}
              {confirmedParticipants.length > 0 && (
                <HStack spacing={1.5} flexWrap="wrap" mb={3}>
                  {confirmedParticipants.map(p => {
                    const payment = payments.find(pay => pay.userId === p.user.id)
                    const paid = payment?.paid ?? false
                    return (
                      <Tooltip
                        key={p.user.id}
                        label={`${p.user.name}: ${paid ? 'оплачено' : 'не оплачено'}`}
                        borderRadius="lg"
                      >
                        <Box
                          position="relative"
                          cursor={p.user.id === user?.id ? 'pointer' : 'default'}
                          onClick={() => {
                            if (p.user.id === user?.id) {
                              toggleExpensePayment(event.id, expense.id, user.id)
                            }
                          }}
                        >
                          <Avatar
                            size="xs"
                            name={p.user.name}
                            opacity={paid ? 1 : 0.3}
                            bg={paid ? 'green.400' : 'gray.300'}
                            transition="all 0.2s"
                          />
                          {paid && (
                            <Box
                              position="absolute"
                              bottom="-1px"
                              right="-1px"
                              w="9px"
                              h="9px"
                              bg="green.400"
                              borderRadius="full"
                              border="1.5px solid white"
                            />
                          )}
                        </Box>
                      </Tooltip>
                    )
                  })}
                </HStack>
              )}

              {/* My payment button */}
              {user && confirmedParticipants.find(p => p.user.id === user.id) && (
                <Button
                  size="sm"
                  w="full"
                  colorScheme={myPayment?.paid ? 'green' : 'gray'}
                  variant={myPayment?.paid ? 'solid' : 'outline'}
                  leftIcon={myPayment?.paid ? <FiCheck /> : undefined}
                  onClick={() => toggleExpensePayment(event.id, expense.id, user.id)}
                >
                  {myPayment?.paid ? 'Оплачено' : 'Отметить оплату'}
                </Button>
              )}
            </Box>
          )
        })}
      </VStack>
    </VStack>
  )
}

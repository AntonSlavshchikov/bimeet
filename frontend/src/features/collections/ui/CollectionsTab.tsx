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
import { FiTrash2, FiPlus, FiCheck, FiPocket } from 'react-icons/fi'
import type { Event } from '@/entities/event/model/types'
import {
  useAddCollection,
  useRemoveCollection,
  useToggleContribution,
} from '@/features/collections/model/hooks'
import { useAuth } from '@/features/auth/model/AuthContext'

export default function CollectionsTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { isOpen, onToggle } = useDisclosure()
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const addCollection = useAddCollection(event.id)
  const removeCollection = useRemoveCollection(event.id)
  const toggleContribution = useToggleContribution(event.id)

  const isOrganizer = event.organizer.id === user?.id

  // Confirmed participants + organizer (если организатор не является участником)
  const confirmedParticipants = event.participants.filter(p => p.status === 'confirmed')
  const isOrganizerParticipant = confirmedParticipants.some(p => p.user.id === event.organizer.id)
  const contributors = isOrganizerParticipant
    ? confirmedParticipants
    : [
        ...confirmedParticipants,
        { id: 'organizer', user: event.organizer, status: 'confirmed' as const },
      ]

  const totalTarget = event.collections.reduce((s, c) => s + c.target_amount, 0)
  const totalPaidCount = event.collections.flatMap(c => c.contributions).filter(c => c.paid).length
  const totalSlots = event.collections.length * contributors.length
  const collectedPct = totalSlots > 0 ? Math.round((totalPaidCount / totalSlots) * 100) : 0
  const perPersonTotal = contributors.length > 0
    ? event.collections.reduce((s, c) => s + Math.ceil(c.target_amount / contributors.length), 0)
    : 0

  function handleAdd() {
    if (!newTitle.trim() || !newAmount) return
    addCollection.mutate({ title: newTitle.trim(), target_amount: Number(newAmount) }, {
      onSuccess: () => {
        setNewTitle('')
        setNewAmount('')
        onToggle()
      },
    })
  }

  return (
    <VStack align="stretch" spacing={5}>
      {event.collections.length > 0 && (
        <Grid templateColumns="repeat(3, 1fr)" gap={2}>
          <Box
            p={3.5} borderRadius="xl"
            bg="subtleBg"
            border="1px solid" borderColor="subtleBorder"
            borderLeft="3px solid" borderLeftColor="purple.400"
          >
            <Text fontSize="xs" color="dimText" fontWeight="500" mb={0.5}>Всего собрать</Text>
            <Text fontSize="lg" fontWeight="700" color="mainText" letterSpacing="-0.5px">
              {totalTarget.toLocaleString('ru-RU')} ₽
            </Text>
          </Box>
          <Box
            p={3.5} borderRadius="xl"
            bg="subtleBg"
            border="1px solid" borderColor="subtleBorder"
            borderLeft="3px solid" borderLeftColor="brand.400"
          >
            <Text fontSize="xs" color="dimText" fontWeight="500" mb={0.5}>С каждого</Text>
            <Text fontSize="lg" fontWeight="700" color="mainText" letterSpacing="-0.5px">
              {perPersonTotal.toLocaleString('ru-RU')} ₽
            </Text>
            <Text fontSize="xs" color="dimText">{confirmedParticipants.length} участников</Text>
          </Box>
          <Box
            p={3.5} borderRadius="xl"
            bg="subtleBg"
            border="1px solid" borderColor="subtleBorder"
            borderLeft="3px solid" borderLeftColor="green.400"
          >
            <Text fontSize="xs" color="dimText" fontWeight="500" mb={0.5}>Скинулись</Text>
            <Text fontSize="lg" fontWeight="700" color="mainText" letterSpacing="-0.5px">
              {collectedPct}%
            </Text>
            <Text fontSize="xs" color="dimText">{totalPaidCount} из {totalSlots}</Text>
          </Box>
        </Grid>
      )}

      {totalSlots > 0 && (
        <Box>
          <HStack justify="space-between" mb={1.5}>
            <Text fontSize="xs" color="faintText" fontWeight="500">Общий прогресс</Text>
            <Text fontSize="xs" color="brand.600" fontWeight="600">{collectedPct}%</Text>
          </HStack>
          <Progress value={collectedPct} borderRadius="full" size="xs" colorScheme="purple" />
        </Box>
      )}

      <HStack justify="space-between">
        <Text fontSize="xs" fontWeight="600" color="faintText" textTransform="uppercase" letterSpacing="0.06em">
          Сборы
        </Text>
        {isOrganizer && (
          <Button size="sm" leftIcon={<FiPlus />} colorScheme="blue" variant="outline" onClick={onToggle}>
            Добавить
          </Button>
        )}
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <Box p={4} borderRadius="xl" bg="subtleBg" border="1px solid" borderColor="subtleBorder">
          <VStack spacing={3}>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="dimText">Название сбора</FormLabel>
              <Input
                size="sm"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Например: Торт"
                autoFocus
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="dimText">Целевая сумма (₽)</FormLabel>
              <NumberInput size="sm" value={newAmount} onChange={setNewAmount} min={1}>
                <NumberInputField placeholder="0" />
              </NumberInput>
              {newAmount && confirmedParticipants.length > 0 && (
                <Text fontSize="xs" color="dimText" mt={1}>
                  По {Math.ceil(Number(newAmount) / confirmedParticipants.length).toLocaleString('ru-RU')} ₽ с каждого
                </Text>
              )}
            </FormControl>
            <HStack w="full" justify="flex-end" spacing={2}>
              <Button size="sm" variant="ghost" onClick={onToggle}>Отмена</Button>
              <Button size="sm" colorScheme="blue" onClick={handleAdd} isLoading={addCollection.isPending}>Создать</Button>
            </HStack>
          </VStack>
        </Box>
      </Collapse>

      {event.collections.length === 0 && (
        <Box textAlign="center" py={10}>
          <Icon as={FiPocket} boxSize={8} color="faintText" mb={2} />
          <Text fontSize="sm" color="dimText">Сборов пока нет</Text>
        </Box>
      )}

      <VStack align="stretch" spacing={3}>
        {event.collections.map(collection => {
          const contributions = collection.contributions ?? []
          const paidCount = contributions.filter(c => c.paid).length
          const myContribution = contributions.find(c => c.user_id === user?.id)
          const allPaid = paidCount === contributors.length && contributors.length > 0
          const shareAmount = contributors.length > 0
            ? Math.ceil(collection.target_amount / contributors.length)
            : 0
          const pct = contributors.length > 0
            ? Math.round((paidCount / contributors.length) * 100)
            : 0

          return (
            <Box
              key={collection.id}
              p={4}
              borderRadius="xl"
              border="1px solid"
              borderColor={allPaid ? 'green.300' : 'subtleBorder'}
              bg="cardBg"
              transition="all 0.2s"
            >
              <HStack justify="space-between" mb={1}>
                <Box minW={0} flex={1}>
                  <Text fontWeight="500" fontSize="sm" noOfLines={1}>{collection.title}</Text>
                  <HStack spacing={1.5} mt={0.5}>
                    <Text fontSize="xs" color="dimText">
                      {collection.target_amount.toLocaleString('ru-RU')} ₽ всего
                    </Text>
                    <Text fontSize="xs" color="faintText">·</Text>
                    <Text fontSize="xs" color="brand.600" fontWeight="600">
                      {shareAmount.toLocaleString('ru-RU')} ₽ с вас
                    </Text>
                  </HStack>
                </Box>
                <HStack spacing={2} flexShrink={0}>
                  <Box px={2.5} py={1} borderRadius="md"
                    bg={allPaid ? 'green.100' : 'orange.50'}
                    _dark={{ bg: allPaid ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.12)' }}
                  >
                    <Text fontSize="xs" fontWeight="600" color={allPaid ? 'green.600' : 'orange.500'}>
                      {paidCount}/{contributors.length}
                    </Text>
                  </Box>
                  {isOrganizer && (
                    <Tooltip
                      label={paidCount > 0 ? 'Нельзя удалить: есть взносы' : ''}
                      isDisabled={paidCount === 0}
                      borderRadius="lg"
                    >
                      <IconButton
                        aria-label="Удалить сбор"
                        icon={<FiTrash2 />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        isDisabled={paidCount > 0}
                        onClick={() => removeCollection.mutate(collection.id)}
                      />
                    </Tooltip>
                  )}
                </HStack>
              </HStack>

              <Progress
                value={pct}
                borderRadius="full"
                size="xs"
                colorScheme={allPaid ? 'green' : 'purple'}
                my={3}
              />

              {contributors.length > 0 && (
                <HStack spacing={1.5} flexWrap="wrap" mb={3}>
                  {contributors.map(p => {
                    const contribution = contributions.find(c => c.user_id === p.user.id)
                    const paid = contribution?.paid ?? false
                    return (
                      <Tooltip
                        key={p.user.id}
                        label={`${p.user.name}: ${paid ? 'скинулся' : 'ещё нет'}`}
                        borderRadius="lg"
                      >
                        <Box
                          position="relative"
                          cursor={p.user.id === user?.id ? 'pointer' : 'default'}
                          onClick={() => {
                            if (p.user.id === user?.id) toggleContribution.mutate(collection.id)
                          }}
                        >
                          <Avatar
                            size="xs"
                            name={p.user.name}
                            opacity={paid ? 1 : 0.35}
                            bg={paid ? 'green.400' : 'faintText'}
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
                              border="1.5px solid"
                              borderColor="cardBg"
                            />
                          )}
                        </Box>
                      </Tooltip>
                    )
                  })}
                </HStack>
              )}

              {user && contributors.find(p => p.user.id === user.id) && (
                <Button
                  size="sm"
                  w="full"
                  colorScheme={myContribution?.paid ? 'green' : 'gray'}
                  variant={myContribution?.paid ? 'solid' : 'outline'}
                  leftIcon={myContribution?.paid ? <FiCheck /> : undefined}
                  onClick={() => toggleContribution.mutate(collection.id)}
                  isLoading={toggleContribution.isPending}
                >
                  {myContribution?.paid ? 'Скинулся' : 'Я скинулся'}
                </Button>
              )}
            </Box>
          )
        })}
      </VStack>
    </VStack>
  )
}

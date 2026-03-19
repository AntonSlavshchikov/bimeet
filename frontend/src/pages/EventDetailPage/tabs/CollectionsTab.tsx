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
import type { Event } from '../../../types'
import { useAddCollection, useRemoveCollection, useToggleContribution } from '../../../store/eventsStore'
import { useAuth } from '../../../context/AuthContext'

export default function CollectionsTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { isOpen, onToggle } = useDisclosure()
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const addCollection = useAddCollection(event.id)
  const removeCollection = useRemoveCollection(event.id)
  const toggleContribution = useToggleContribution(event.id)

  const isOrganizer = event.organizer.id === user?.id
  const confirmedParticipants = event.participants.filter(p => p.status === 'confirmed')

  const totalTarget = event.collections.reduce((s, c) => s + c.target_amount, 0)
  const totalPaidCount = event.collections.flatMap(c => c.contributions).filter(c => c.paid).length
  const totalSlots = event.collections.length * confirmedParticipants.length
  const collectedPct = totalSlots > 0 ? Math.round((totalPaidCount / totalSlots) * 100) : 0
  const perPersonTotal = confirmedParticipants.length > 0
    ? event.collections.reduce((s, c) => s + Math.ceil(c.target_amount / confirmedParticipants.length), 0)
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
      {/* Summary cards */}
      {event.collections.length > 0 && (
        <Grid templateColumns="repeat(3, 1fr)" gap={2}>
          <Box p={3.5} borderRadius="xl" bg="purple.50" border="1px solid" borderColor="rgba(0,0,0,0.05)">
            <Text fontSize="xs" color="gray.500" fontWeight="500" mb={0.5}>Всего собрать</Text>
            <Text fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.5px">
              {totalTarget.toLocaleString('ru-RU')} ₽
            </Text>
          </Box>
          <Box p={3.5} borderRadius="xl" bg="blue.50" border="1px solid" borderColor="rgba(0,0,0,0.05)">
            <Text fontSize="xs" color="gray.500" fontWeight="500" mb={0.5}>С каждого</Text>
            <Text fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.5px">
              {perPersonTotal.toLocaleString('ru-RU')} ₽
            </Text>
            <Text fontSize="xs" color="gray.400">{confirmedParticipants.length} участников</Text>
          </Box>
          <Box p={3.5} borderRadius="xl" bg="green.50" border="1px solid" borderColor="rgba(0,0,0,0.05)">
            <Text fontSize="xs" color="gray.500" fontWeight="500" mb={0.5}>Скинулись</Text>
            <Text fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.5px">
              {collectedPct}%
            </Text>
            <Text fontSize="xs" color="gray.400">{totalPaidCount} из {totalSlots}</Text>
          </Box>
        </Grid>
      )}

      {/* Progress */}
      {totalSlots > 0 && (
        <Box>
          <HStack justify="space-between" mb={1.5}>
            <Text fontSize="xs" color="gray.400" fontWeight="500">Общий прогресс</Text>
            <Text fontSize="xs" color="brand.600" fontWeight="600">{collectedPct}%</Text>
          </HStack>
          <Progress value={collectedPct} borderRadius="full" size="xs" colorScheme="purple" />
        </Box>
      )}

      {/* Section header */}
      <HStack justify="space-between">
        <Text fontSize="xs" fontWeight="600" color="gray.400" textTransform="uppercase" letterSpacing="0.06em">
          Сборы
        </Text>
        {isOrganizer && (
          <Button size="sm" leftIcon={<FiPlus />} colorScheme="blue" variant="outline" onClick={onToggle}>
            Добавить
          </Button>
        )}
      </HStack>

      {/* Add form */}
      <Collapse in={isOpen} animateOpacity>
        <Box p={4} borderRadius="xl" bg="gray.50" border="1px solid" borderColor="gray.100">
          <VStack spacing={3}>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="gray.500">Название сбора</FormLabel>
              <Input
                size="sm"
                bg="white"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Например: Торт"
                autoFocus
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="gray.500">Целевая сумма (₽)</FormLabel>
              <NumberInput size="sm" value={newAmount} onChange={setNewAmount} min={1}>
                <NumberInputField bg="white" placeholder="0" />
              </NumberInput>
              {newAmount && confirmedParticipants.length > 0 && (
                <Text fontSize="xs" color="gray.400" mt={1}>
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

      {/* Empty state */}
      {event.collections.length === 0 && (
        <Box textAlign="center" py={10}>
          <Icon as={FiPocket} boxSize={8} color="gray.200" mb={2} />
          <Text fontSize="sm" color="gray.400">Сборов пока нет</Text>
        </Box>
      )}

      {/* Collection cards */}
      <VStack align="stretch" spacing={3}>
        {event.collections.map(collection => {
          const contributions = collection.contributions ?? []
          const paidCount = contributions.filter(c => c.paid).length
          const myContribution = contributions.find(c => c.user_id === user?.id)
          const allPaid = paidCount === confirmedParticipants.length && confirmedParticipants.length > 0
          const shareAmount = confirmedParticipants.length > 0
            ? Math.ceil(collection.target_amount / confirmedParticipants.length)
            : 0
          const pct = confirmedParticipants.length > 0
            ? Math.round((paidCount / confirmedParticipants.length) * 100)
            : 0

          return (
            <Box
              key={collection.id}
              p={4}
              borderRadius="xl"
              border="1px solid"
              borderColor={allPaid ? 'green.100' : 'gray.100'}
              bg={allPaid ? 'green.50' : 'white'}
              transition="all 0.2s"
            >
              {/* Header */}
              <HStack justify="space-between" mb={1}>
                <Box minW={0} flex={1}>
                  <Text fontWeight="500" fontSize="sm" noOfLines={1}>{collection.title}</Text>
                  <HStack spacing={1.5} mt={0.5}>
                    <Text fontSize="xs" color="gray.400">
                      {collection.target_amount.toLocaleString('ru-RU')} ₽ всего
                    </Text>
                    <Text fontSize="xs" color="gray.300">·</Text>
                    <Text fontSize="xs" color="brand.600" fontWeight="600">
                      {shareAmount.toLocaleString('ru-RU')} ₽ с вас
                    </Text>
                  </HStack>
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
                      aria-label="Удалить сбор"
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => removeCollection.mutate(collection.id)}
                    />
                  )}
                </HStack>
              </HStack>

              {/* Progress bar */}
              <Progress
                value={pct}
                borderRadius="full"
                size="xs"
                colorScheme={allPaid ? 'green' : 'purple'}
                my={3}
              />

              {/* Participant avatars */}
              {confirmedParticipants.length > 0 && (
                <HStack spacing={1.5} flexWrap="wrap" mb={3}>
                  {confirmedParticipants.map(p => {
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
                            if (p.user.id === user?.id) {
                              toggleContribution.mutate(collection.id)
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

              {/* My action button */}
              {user && confirmedParticipants.find(p => p.user.id === user.id) && (
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

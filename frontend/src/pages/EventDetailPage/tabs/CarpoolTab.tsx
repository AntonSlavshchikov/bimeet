import {
  VStack,
  HStack,
  Text,
  Button,
  Box,
  Avatar,
  AvatarGroup,
  Input,
  NumberInput,
  NumberInputField,
  useDisclosure,
  Collapse,
  FormControl,
  FormLabel,
  Icon,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FiMapPin, FiUsers, FiPlus, FiTruck } from 'react-icons/fi'
import type { Event } from '../../../types'
import { useAddCarpool, useJoinCarpool } from '../../../store/eventsStore'
import { useAuth } from '../../../context/AuthContext'

export default function CarpoolTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { isOpen, onToggle } = useDisclosure()
  const [departure, setDeparture] = useState('')
  const [seats, setSeats] = useState('3')

  const addCarpool = useAddCarpool(event.id)
  const joinCarpool = useJoinCarpool(event.id)

  const isDriver = event.carpools.some(c => c.driver.id === user?.id)

  function handleCreate() {
    if (!departure.trim() || !seats) return
    addCarpool.mutate({ departure_point: departure.trim(), seats_available: Number(seats) }, {
      onSuccess: () => {
        setDeparture('')
        setSeats('3')
        onToggle()
      },
    })
  }

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <Text fontSize="xs" fontWeight="600" color="gray.400" textTransform="uppercase" letterSpacing="0.06em">
          Совместные поездки
        </Text>
        {!isDriver && (
          <Button size="sm" leftIcon={<FiPlus />} colorScheme="blue" variant="outline" onClick={onToggle}>
            Предложить места
          </Button>
        )}
      </HStack>

      {/* Create form */}
      <Collapse in={isOpen} animateOpacity>
        <Box p={4} borderRadius="xl" bg="gray.50" border="1px solid" borderColor="gray.100">
          <VStack spacing={3}>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="gray.500">Откуда едете</FormLabel>
              <Input
                size="sm"
                bg="white"
                value={departure}
                onChange={e => setDeparture(e.target.value)}
                placeholder="Например: м. Лубянка"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="gray.500">Свободных мест</FormLabel>
              <NumberInput size="sm" value={seats} onChange={setSeats} min={1} max={8}>
                <NumberInputField bg="white" />
              </NumberInput>
            </FormControl>
            <HStack w="full" justify="flex-end" spacing={2}>
              <Button size="sm" variant="ghost" onClick={onToggle}>Отмена</Button>
              <Button size="sm" colorScheme="blue" onClick={handleCreate} isLoading={addCarpool.isPending}>Создать</Button>
            </HStack>
          </VStack>
        </Box>
      </Collapse>

      {/* Empty state */}
      {event.carpools.length === 0 && (
        <Box textAlign="center" py={10}>
          <Icon as={FiTruck} boxSize={8} color="gray.200" mb={2} />
          <Text fontSize="sm" color="gray.400">Поездок пока нет</Text>
        </Box>
      )}

      {/* Carpools */}
      <VStack align="stretch" spacing={3}>
        {event.carpools.map(carpool => {
          const freeSeats = carpool.seats_available - carpool.passengers.length
          const iAmDriver = carpool.driver.id === user?.id
          const iAmPassenger = carpool.passengers.some(p => p.id === user?.id)

          return (
            <Box
              key={carpool.id}
              p={4}
              borderRadius="xl"
              border="1px solid"
              borderColor={iAmDriver ? 'brand.100' : 'gray.100'}
              bg={iAmDriver ? 'brand.50' : 'white'}
            >
              {/* Driver row */}
              <HStack justify="space-between" mb={3}>
                <HStack spacing={3} minW={0} flex={1}>
                  <Avatar size="sm" name={carpool.driver.name} bg="brand.400" color="white" flexShrink={0} />
                  <Box minW={0}>
                    <Text fontWeight="500" fontSize="sm" noOfLines={1}>
                      {carpool.driver.name}
                      {iAmDriver && (
                        <Text as="span" fontSize="xs" color="brand.500" ml={1.5}>(вы)</Text>
                      )}
                    </Text>
                    <HStack spacing={1} color="gray.400">
                      <Icon as={FiMapPin} boxSize={3} />
                      <Text fontSize="xs" noOfLines={1}>{carpool.departure_point}</Text>
                    </HStack>
                  </Box>
                </HStack>
                <HStack spacing={1.5} flexShrink={0}>
                  <Icon as={FiUsers} boxSize={3.5} color="gray.400" />
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    color={freeSeats > 0 ? 'green.600' : 'red.500'}
                  >
                    {freeSeats}/{carpool.seats_available}
                  </Text>
                </HStack>
              </HStack>

              {/* Passengers */}
              {carpool.passengers.length > 0 && (
                <HStack spacing={2} mb={3}>
                  <Text fontSize="xs" color="gray.400">Пассажиры:</Text>
                  <AvatarGroup size="xs" max={6} spacing="-6px">
                    {carpool.passengers.map(p => (
                      <Avatar key={p.id} name={p.name} />
                    ))}
                  </AvatarGroup>
                </HStack>
              )}

              {/* Action */}
              {!iAmDriver && !isDriver && (
                <Button
                  size="sm"
                  w="full"
                  colorScheme={iAmPassenger ? 'red' : 'blue'}
                  variant={iAmPassenger ? 'outline' : 'solid'}
                  isDisabled={!iAmPassenger && freeSeats === 0}
                  onClick={() => user && joinCarpool.mutate(carpool.id)}
                  isLoading={joinCarpool.isPending}
                >
                  {iAmPassenger ? 'Покинуть поездку' : freeSeats === 0 ? 'Мест нет' : 'Еду с ними'}
                </Button>
              )}
            </Box>
          )
        })}
      </VStack>
    </VStack>
  )
}

import {
  VStack,
  HStack,
  Text,
  Button,
  Box,
  Avatar,
  Input,
  FormControl,
  FormLabel,
  useDisclosure,
  Collapse,
  Icon,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FiPlus, FiShoppingBag } from 'react-icons/fi'
import type { Event } from '../../../types'
import { useAddItem, useAssignItem } from '../../../store/eventsStore'
import { useAuth } from '../../../context/AuthContext'

export default function ItemsTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { isOpen, onToggle } = useDisclosure()
  const [newName, setNewName] = useState('')

  const addItem = useAddItem(event.id)
  const assignItem = useAssignItem(event.id)

  function handleAdd() {
    if (!newName.trim()) return
    addItem.mutate(newName.trim(), {
      onSuccess: () => {
        setNewName('')
        onToggle()
      },
    })
  }

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <Text fontSize="xs" fontWeight="600" color="gray.400" textTransform="uppercase" letterSpacing="0.06em">
          Кто что берёт
        </Text>
        <Button size="sm" leftIcon={<FiPlus />} colorScheme="blue" variant="outline" onClick={onToggle}>
          Добавить
        </Button>
      </HStack>

      {/* Add form */}
      <Collapse in={isOpen} animateOpacity>
        <Box p={4} borderRadius="xl" bg="gray.50" border="1px solid" borderColor="gray.100">
          <VStack spacing={3}>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="gray.500">Что нужно взять</FormLabel>
              <Input
                size="sm"
                bg="white"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Например: Гитара"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
            </FormControl>
            <HStack w="full" justify="flex-end" spacing={2}>
              <Button size="sm" variant="ghost" onClick={onToggle}>Отмена</Button>
              <Button size="sm" colorScheme="blue" onClick={handleAdd} isLoading={addItem.isPending}>Добавить</Button>
            </HStack>
          </VStack>
        </Box>
      </Collapse>

      {/* Empty state */}
      {event.items.length === 0 && (
        <Box textAlign="center" py={10}>
          <Icon as={FiShoppingBag} boxSize={8} color="gray.200" mb={2} />
          <Text fontSize="sm" color="gray.400">Список пуст</Text>
        </Box>
      )}

      {/* Items */}
      <VStack align="stretch" spacing={2}>
        {event.items.map(item => {
          const isMine = item.assigned_to?.id === user?.id
          const isTaken = Boolean(item.assigned_to)

          return (
            <Box
              key={item.id}
              p={3.5}
              borderRadius="xl"
              border="1px solid"
              borderColor={isMine ? 'brand.100' : 'gray.100'}
              bg={isMine ? 'brand.50' : 'white'}
            >
              <HStack justify="space-between">
                <HStack spacing={3} minW={0} flex={1}>
                  {item.assigned_to ? (
                    <Avatar size="sm" name={item.assigned_to.name} bg="brand.400" color="white" flexShrink={0} />
                  ) : (
                    <Box
                      w="32px"
                      h="32px"
                      borderRadius="full"
                      bg="gray.100"
                      flexShrink={0}
                    />
                  )}
                  <Box minW={0}>
                    <Text fontSize="sm" fontWeight="500" noOfLines={1}>{item.name}</Text>
                    {item.assigned_to ? (
                      <Text fontSize="xs" color={isMine ? 'brand.600' : 'green.600'}>
                        {isMine ? 'Берёте вы' : item.assigned_to.name}
                      </Text>
                    ) : (
                      <Text fontSize="xs" color="gray.400">Никто не взялся</Text>
                    )}
                  </Box>
                </HStack>

                {isMine ? (
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    flexShrink={0}
                    onClick={() => assignItem.mutate({ itemId: item.id, userId: null })}
                    isLoading={assignItem.isPending}
                  >
                    Отказаться
                  </Button>
                ) : !isTaken ? (
                  <Button
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    flexShrink={0}
                    onClick={() => user && assignItem.mutate({ itemId: item.id, userId: user.id })}
                    isLoading={assignItem.isPending}
                  >
                    Возьму я
                  </Button>
                ) : (
                  <Box px={2.5} py={1} borderRadius="md" bg="green.50" flexShrink={0}>
                    <Text fontSize="xs" fontWeight="600" color="green.600">Занято</Text>
                  </Box>
                )}
              </HStack>
            </Box>
          )
        })}
      </VStack>
    </VStack>
  )
}

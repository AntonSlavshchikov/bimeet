import {
  VStack,
  HStack,
  Text,
  Button,
  Box,
  Progress,
  Input,
  IconButton,
  FormControl,
  FormLabel,
  useDisclosure,
  Collapse,
  Icon,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FiPlus, FiTrash2, FiBarChart2 } from 'react-icons/fi'
import type { Event } from '../../../types'
import { useAddPoll, useVote } from '../../../store/eventsStore'
import { useAuth } from '../../../context/AuthContext'

export default function PollsTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { isOpen, onToggle } = useDisclosure()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const isOrganizer = event.organizer.id === user?.id

  const addPoll = useAddPoll(event.id)
  const castVote = useVote(event.id)

  function handleAddOption() {
    setOptions(o => [...o, ''])
  }

  function handleRemoveOption(i: number) {
    setOptions(o => o.filter((_, idx) => idx !== i))
  }

  function handleCreate() {
    const validOptions = options.filter(o => o.trim())
    if (!question.trim() || validOptions.length < 2) return
    addPoll.mutate({ question: question.trim(), options: validOptions }, {
      onSuccess: () => {
        setQuestion('')
        setOptions(['', ''])
        onToggle()
      },
    })
  }

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <Text fontSize="xs" fontWeight="600" color="gray.400" textTransform="uppercase" letterSpacing="0.06em">
          Опросы
        </Text>
        {isOrganizer && (
          <Button size="sm" leftIcon={<FiPlus />} colorScheme="blue" variant="outline" onClick={onToggle}>
            Новый опрос
          </Button>
        )}
      </HStack>

      {/* Create form */}
      <Collapse in={isOpen} animateOpacity>
        <Box p={4} borderRadius="xl" bg="gray.50" border="1px solid" borderColor="gray.100">
          <VStack spacing={3}>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="gray.500">Вопрос</FormLabel>
              <Input
                size="sm"
                bg="white"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Например: Что приготовить на мангале?"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="gray.500">Варианты ответов</FormLabel>
              <VStack spacing={2}>
                {options.map((opt, i) => (
                  <HStack key={i} w="full">
                    <Input
                      size="sm"
                      bg="white"
                      value={opt}
                      onChange={e => setOptions(o => o.map((v, idx) => idx === i ? e.target.value : v))}
                      placeholder={`Вариант ${i + 1}`}
                    />
                    {options.length > 2 && (
                      <IconButton
                        aria-label="Удалить"
                        icon={<FiTrash2 />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleRemoveOption(i)}
                      />
                    )}
                  </HStack>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  color="brand.600"
                  alignSelf="flex-start"
                  onClick={handleAddOption}
                  px={0}
                >
                  + Добавить вариант
                </Button>
              </VStack>
            </FormControl>
            <HStack w="full" justify="flex-end" spacing={2}>
              <Button size="sm" variant="ghost" onClick={onToggle}>Отмена</Button>
              <Button size="sm" colorScheme="blue" onClick={handleCreate} isLoading={addPoll.isPending}>Создать</Button>
            </HStack>
          </VStack>
        </Box>
      </Collapse>

      {/* Empty state */}
      {event.polls.length === 0 && (
        <Box textAlign="center" py={10} color="gray.300">
          <Icon as={FiBarChart2} boxSize={8} mb={2} />
          <Text fontSize="sm" color="gray.400">Опросов пока нет</Text>
        </Box>
      )}

      {/* Polls */}
      {event.polls.map(poll => {
        const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0)
        const myVote = poll.options.find(o => o.votes.includes(user?.id ?? ''))

        return (
          <Box
            key={poll.id}
            p={4}
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.100"
            bg="white"
          >
            <Text fontWeight="500" fontSize="sm" mb={3}>{poll.question}</Text>
            <VStack align="stretch" spacing={2}>
              {poll.options.map(option => {
                const pct = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0
                const isMyVote = myVote?.id === option.id
                return (
                  <Box
                    key={option.id}
                    p={3}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={isMyVote ? 'brand.200' : 'gray.100'}
                    bg={isMyVote ? 'brand.50' : 'gray.50'}
                    cursor="pointer"
                    onClick={() => user && castVote.mutate({ pollId: poll.id, optionId: option.id })}
                    _hover={{ borderColor: isMyVote ? 'brand.300' : 'gray.200' }}
                    transition="all 0.15s"
                  >
                    <HStack justify="space-between" mb={1.5}>
                      <Text
                        fontSize="sm"
                        fontWeight={isMyVote ? '600' : '400'}
                        color={isMyVote ? 'brand.700' : 'gray.700'}
                        flex={1}
                        noOfLines={2}
                      >
                        {option.label}
                      </Text>
                      <Text fontSize="xs" color="gray.400" flexShrink={0} ml={2}>
                        {option.votes.length} · {pct}%
                      </Text>
                    </HStack>
                    <Progress
                      value={pct}
                      size="xs"
                      colorScheme={isMyVote ? 'purple' : 'gray'}
                      borderRadius="full"
                    />
                  </Box>
                )
              })}
            </VStack>
            <Text fontSize="xs" color="gray.400" mt={2}>Всего голосов: {totalVotes}</Text>
          </Box>
        )
      })}
    </VStack>
  )
}

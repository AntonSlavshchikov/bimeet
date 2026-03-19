import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Spinner,
  useToast,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FiCalendar, FiMapPin, FiUsers } from 'react-icons/fi'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Event } from '../types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    apiFetch<Event>(`/api/events/invite/${token}`)
      .then(setEvent)
      .catch(() => setEvent(null))
      .finally(() => setLoading(false))
  }, [token])

  async function handleJoin() {
    if (!user) {
      navigate(`/login?redirect=/invite/${token}`)
      return
    }
    setJoining(true)
    try {
      await apiFetch(`/api/events/invite/${token}`, { method: 'POST' })
      toast({ title: 'Вы присоединились к встрече', status: 'success', duration: 2000 })
      navigate(`/events/${event!.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка'
      toast({ title: msg, status: 'error', duration: 3000 })
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="lg" color="brand.500" />
      </Box>
    )
  }

  if (!event) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
        <VStack spacing={4} textAlign="center">
          <Text fontSize="lg" fontWeight="600" color="gray.600">Приглашение недействительно</Text>
          <Text color="gray.400" fontSize="sm">Ссылка устарела или встреча не найдена</Text>
          <Button as={Link} to="/events" colorScheme="blue" size="sm">На главную</Button>
        </VStack>
      </Box>
    )
  }

  const confirmedCount = event.participants.filter(p => p.status === 'confirmed').length
  const alreadyJoined = event.participants.some(p => p.user.id === user?.id)

  return (
    <Box minH="100vh" bg="#F5F5F7" display="flex" alignItems="center" justifyContent="center" p={4}>
      <Box w="full" maxW="420px">
        {/* Logo */}
        <VStack spacing={1.5} align="center" mb={6}>
          <HStack spacing={2}>
            <Box
              w="28px" h="28px" borderRadius="md" bg="brand.600"
              display="flex" alignItems="center" justifyContent="center"
            >
              <Text fontSize="12px" lineHeight={1} color="white">✦</Text>
            </Box>
            <Text fontSize="lg" fontWeight="600" color="gray.900" letterSpacing="-0.3px">MeetUp</Text>
          </HStack>
        </VStack>

        <Box
          bg="white"
          borderRadius="xl"
          overflow="hidden"
          border="1px solid"
          borderColor="rgba(0,0,0,0.07)"
          boxShadow="0 2px 16px rgba(0,0,0,0.07)"
        >
          <Box h="3px" bgGradient="linear(135deg, brand.500, #6366F1)" />
          <Box p={6}>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontSize="xs" fontWeight="600" color="brand.500" textTransform="uppercase" letterSpacing="0.06em" mb={1}>
                  Приглашение на встречу
                </Text>
                <Heading size="md" letterSpacing="-0.3px">{event.title}</Heading>
                {event.description && (
                  <Text fontSize="sm" color="gray.500" mt={1} lineHeight="1.5">{event.description}</Text>
                )}
              </Box>

              <VStack align="stretch" spacing={2}>
                <HStack spacing={2}>
                  <Icon as={FiCalendar} color="brand.400" boxSize={4} />
                  <Text fontSize="sm" color="gray.600">
                    {formatDate(event.date_start)}, {formatTime(event.date_start)}
                  </Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={FiMapPin} color="brand.400" boxSize={4} />
                  <Text fontSize="sm" color="gray.600">{event.location}</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={FiUsers} color="brand.400" boxSize={4} />
                  <Text fontSize="sm" color="gray.600">{confirmedCount} подтвердили участие</Text>
                </HStack>
              </VStack>

              <Text fontSize="xs" color="gray.400">
                Организатор: <Text as="span" fontWeight="600">{event.organizer.name}</Text>
              </Text>

              {alreadyJoined ? (
                <Button as={Link} to={`/events/${event.id}`} colorScheme="blue" w="full">
                  Открыть встречу
                </Button>
              ) : (
                <Button
                  colorScheme="blue"
                  w="full"
                  onClick={handleJoin}
                  isLoading={joining}
                >
                  {user ? 'Присоединиться' : 'Войти и присоединиться'}
                </Button>
              )}

              {!user && (
                <Text fontSize="xs" color="gray.400" textAlign="center">
                  Нужен аккаунт MeetUp.{' '}
                  <Text as={Link} to={`/register?redirect=/invite/${token}`} color="brand.600" fontWeight="600">
                    Зарегистрироваться
                  </Text>
                </Text>
              )}
            </VStack>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

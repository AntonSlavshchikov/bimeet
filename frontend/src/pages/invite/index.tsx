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
import { apiFetch } from '@/shared/api/client'
import { useAuth } from '@/features/auth/model/AuthContext'
import type { Event } from '@/entities/event/model/types'
import { formatDate, formatTime } from '@/shared/lib/formatDate'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    apiFetch<Event>(`/api/events/invite/${token}`)
      .then(setEvent)
      .catch(() => setEvent(null))
      .finally(() => setLoading(false))
  }, [token])

  async function handleAction(action: 'join' | 'decline') {
    if (!user) {
      navigate(`/register?redirect=/invite/${token}`)
      return
    }
    setActing(true)
    try {
      await apiFetch(`/api/events/invite/${token}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      if (action === 'join') {
        toast({ title: 'Вы присоединились к встрече', status: 'success', duration: 2000 })
        navigate(`/events/${event!.id}`)
      } else {
        toast({ title: 'Приглашение отклонено', status: 'info', duration: 2000 })
        navigate('/events')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка'
      toast({ title: msg, status: 'error', duration: 3000 })
    } finally {
      setActing(false)
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
          <Text fontSize="lg" fontWeight="600" color="dimText">Приглашение недействительно</Text>
          <Text color="faintText" fontSize="sm">Ссылка устарела или встреча не найдена</Text>
          <Button as={Link} to="/events" colorScheme="blue" size="sm">На главную</Button>
        </VStack>
      </Box>
    )
  }

  const confirmedCount = event.participants.filter(p => p.status === 'confirmed').length
  const myParticipant = user ? event.participants.find(p => p.user.id === user.id) : null
  const alreadyJoined = myParticipant?.status === 'confirmed'
  const alreadyDeclined = myParticipant?.status === 'declined'

  return (
    <Box minH="100vh" bg="pageBg" display="flex" alignItems="center" justifyContent="center" p={4}>
      <Box w="full" maxW="420px">
        <VStack spacing={1.5} align="center" mb={6}>
          <HStack spacing={2}>
            <Box
              w="28px" h="28px" borderRadius="md" bg="brand.600"
              display="flex" alignItems="center" justifyContent="center"
            >
              <Text fontSize="12px" lineHeight={1} color="white">✦</Text>
            </Box>
            <Text fontSize="lg" fontWeight="600" color="mainText" letterSpacing="-0.3px">MeetUp</Text>
          </HStack>
        </VStack>

        <Box
          bg="cardBg"
          borderRadius="xl"
          overflow="hidden"
          border="1px solid"
          borderColor="cardBorder"
          boxShadow="0 2px 16px rgba(0,0,0,0.07)"
        >
          <Box h="4px" bgGradient="linear(135deg, brand.600, #7C3AED)" />
          <Box p={6}>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontSize="xs" fontWeight="600" color="brand.500" textTransform="uppercase" letterSpacing="0.06em" mb={1}>
                  Приглашение на встречу
                </Text>
                <Heading size="md" letterSpacing="-0.3px">{event.title}</Heading>
                {event.description && (
                  <Text fontSize="sm" color="dimText" mt={1} lineHeight="1.5">{event.description}</Text>
                )}
              </Box>

              <VStack align="stretch" spacing={2}>
                <HStack spacing={2}>
                  <Icon as={FiCalendar} color="brand.400" boxSize={4} />
                  <Text fontSize="sm" color="dimText">
                    {formatDate(event.date_start)}, {formatTime(event.date_start)}
                  </Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={FiMapPin} color="brand.400" boxSize={4} />
                  <Text fontSize="sm" color="dimText">{event.location}</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={FiUsers} color="brand.400" boxSize={4} />
                  <Text fontSize="sm" color="dimText">{confirmedCount} подтвердили участие</Text>
                </HStack>
              </VStack>

              <Text fontSize="xs" color="faintText">
                Организатор: <Text as="span" fontWeight="600">{event.organizer.name}</Text>
              </Text>

              {alreadyJoined ? (
                <Button as={Link} to={`/events/${event.id}`} colorScheme="blue" w="full">
                  Открыть встречу
                </Button>
              ) : alreadyDeclined ? (
                <VStack spacing={2}>
                  <Text fontSize="sm" color="faintText" textAlign="center">Вы отклонили это приглашение</Text>
                  <Button colorScheme="blue" variant="outline" w="full" onClick={() => handleAction('join')} isLoading={acting}>
                    Всё-таки приму участие
                  </Button>
                </VStack>
              ) : !user ? (
                <VStack spacing={2}>
                  <Button colorScheme="blue" w="full" as={Link} to={`/register?redirect=/invite/${token}`}>
                    Зарегистрироваться и принять
                  </Button>
                  <Button colorScheme="blue" variant="outline" w="full" as={Link} to={`/login?redirect=/invite/${token}`}>
                    Войти
                  </Button>
                </VStack>
              ) : (
                <HStack spacing={2}>
                  <Button colorScheme="blue" flex={1} onClick={() => handleAction('join')} isLoading={acting}>
                    Принять
                  </Button>
                  <Button colorScheme="gray" variant="outline" flex={1} onClick={() => handleAction('decline')} isLoading={acting}>
                    Отклонить
                  </Button>
                </HStack>
              )}
            </VStack>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

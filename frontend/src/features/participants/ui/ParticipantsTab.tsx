import {
  VStack,
  HStack,
  Stack,
  Avatar,
  Text,
  Button,
  Box,
  Badge,
  Input,
  FormControl,
  useDisclosure,
  Collapse,
  useToast,
  Icon,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FiPlus, FiLink, FiMail } from 'react-icons/fi'
import type { Event } from '@/entities/event/model/types'
import { useInviteParticipant, useUpdateParticipantStatus, usePendingInvitations } from '@/features/participants/model/hooks'
import { useAuth } from '@/features/auth/model/AuthContext'

const statusLabel = { invited: 'Приглашён', confirmed: 'Идёт', declined: 'Не идёт' }

const statusScheme = {
  invited:   'yellow',
  confirmed: 'green',
  declined:  'red',
} as const

export default function ParticipantsTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const toast = useToast()
  const { isOpen, onToggle } = useDisclosure()
  const [email, setEmail] = useState('')

  const updateStatus = useUpdateParticipantStatus(event.id)
  const invite = useInviteParticipant(event.id)

  const isOrganizer = event.organizer.id === user?.id
  const { data: pendingInvitations = [] } = usePendingInvitations(event.id, isOrganizer)
  const myParticipant = event.participants.find(p => p.user.id === user?.id)

  const confirmed = event.participants.filter(p => p.status === 'confirmed').length
  const invited   = event.participants.filter(p => p.status === 'invited').length
  const declined  = event.participants.filter(p => p.status === 'declined').length

  function handleInvite() {
    if (!email.trim()) return
    invite.mutate(email.trim(), {
      onSuccess: (resp) => {
        const title = resp?.status === 'pending'
          ? 'Приглашение отправлено на email'
          : 'Приглашение отправлено'
        toast({ title, status: 'success', duration: 2000 })
        setEmail('')
        onToggle()
      },
      onError: (err) => {
        toast({ title: 'Ошибка', description: err.message, status: 'error', duration: 3000 })
      },
    })
  }

  function handleCopyLink() {
    const link = `${window.location.origin}/invite/${event.invite_token}`
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: 'Ссылка скопирована', status: 'success', duration: 2000 })
    })
  }

  return (
    <VStack align="stretch" spacing={4}>
      {myParticipant && !isOrganizer && (
        <Box p={4} borderRadius="xl" bg="subtleBg" border="1px solid" borderColor="subtleBorder">
          <Text fontSize="sm" fontWeight="500" color="dimText" mb={3}>Ваш статус</Text>
          <HStack spacing={2}>
            <Button
              flex={1}
              size="sm"
              colorScheme="green"
              variant={myParticipant.status === 'confirmed' ? 'solid' : 'outline'}
              onClick={() => user && updateStatus.mutate({ userId: user.id, status: 'confirmed' })}
              isLoading={updateStatus.isPending}
            >
              Иду
            </Button>
            <Button
              flex={1}
              size="sm"
              colorScheme="red"
              variant={myParticipant.status === 'declined' ? 'solid' : 'outline'}
              onClick={() => user && updateStatus.mutate({ userId: user.id, status: 'declined' })}
              isLoading={updateStatus.isPending}
            >
              Не иду
            </Button>
          </HStack>
        </Box>
      )}

      {isOrganizer && (
        <Stack direction={{ base: 'column', sm: 'row' }} spacing={2}>
          <Button
            size="sm"
            leftIcon={<FiPlus />}
            colorScheme="blue"
            variant="outline"
            onClick={onToggle}
            flex={1}
          >
            Пригласить по email
          </Button>
          <Button
            size="sm"
            leftIcon={<Icon as={FiLink} />}
            variant="outline"
            onClick={handleCopyLink}
            flex={1}
          >
            Скопировать ссылку
          </Button>
        </Stack>
      )}

      <Collapse in={isOpen} animateOpacity>
        <Box p={4} borderRadius="xl" bg="subtleBg" border="1px solid" borderColor="subtleBorder">
          <FormControl>
            <Text fontSize="xs" fontWeight="600" color="dimText" mb={2}>Email участника</Text>
            <VStack spacing={2} align="stretch">
              <Input
                size="sm"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                autoFocus
              />
              <HStack spacing={2} justify="flex-end">
                <Button size="sm" variant="ghost" onClick={onToggle}>Отмена</Button>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={handleInvite}
                  isLoading={invite.isPending}
                >
                  Пригласить
                </Button>
              </HStack>
            </VStack>
          </FormControl>
        </Box>
      </Collapse>

      <HStack spacing={2} flexWrap="wrap">
        <Badge colorScheme="green" variant="subtle" px={2.5} py={1}>{confirmed} идут</Badge>
        <Badge colorScheme="yellow" variant="subtle" px={2.5} py={1}>{invited} приглашены</Badge>
        {isOrganizer && pendingInvitations.length > 0 && (
          <Badge colorScheme="orange" variant="subtle" px={2.5} py={1}>{pendingInvitations.length} ждут регистрации</Badge>
        )}
        {declined > 0 && (
          <Badge colorScheme="red" variant="subtle" px={2.5} py={1}>{declined} отказались</Badge>
        )}
      </HStack>

      <VStack align="stretch" spacing={2}>
        {event.participants.map(p => (
          <HStack key={p.id} justify="space-between" p={3} borderRadius="lg" bg="subtleBg">
            <HStack spacing={3} minW={0} flex={1}>
              <Avatar
                size="sm"
                name={p.user.name}
                bg="brand.100"
                color="brand.700"
                flexShrink={0}
              />
              <Box minW={0}>
                <HStack spacing={1.5}>
                  <Text fontWeight="500" fontSize="sm" noOfLines={1}>{p.user.name}</Text>
                  {p.user.id === event.organizer.id && (
                    <Badge colorScheme="purple" fontSize="xs" flexShrink={0}>орг.</Badge>
                  )}
                </HStack>
                <Text fontSize="xs" color="faintText" noOfLines={1}>{p.user.email}</Text>
              </Box>
            </HStack>
            <Badge
              colorScheme={statusScheme[p.status]}
              variant="subtle"
              flexShrink={0}
            >
              {statusLabel[p.status]}
            </Badge>
          </HStack>
        ))}

        {isOrganizer && pendingInvitations.map(p => (
          <HStack key={p.id} justify="space-between" p={3} borderRadius="lg" bg="subtleBg" opacity={0.7}>
            <HStack spacing={3} minW={0} flex={1}>
              <Box
                w="32px" h="32px" borderRadius="full"
                bg="subtleBg" border="1px dashed" borderColor="subtleBorder"
                display="flex" alignItems="center" justifyContent="center"
                flexShrink={0}
              >
                <Icon as={FiMail} boxSize={3.5} color="faintText" />
              </Box>
              <Text fontSize="sm" color="dimText" noOfLines={1}>{p.email}</Text>
            </HStack>
            <Badge colorScheme="orange" variant="subtle" flexShrink={0}>ждёт регистрации</Badge>
          </HStack>
        ))}
      </VStack>
    </VStack>
  )
}

import {
  VStack,
  HStack,
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
import { FiPlus, FiLink } from 'react-icons/fi'
import type { Event } from '../../../types'
import { useInviteParticipant, useUpdateParticipantStatus } from '../../../store/eventsStore'
import { useAuth } from '../../../context/AuthContext'

const statusLabel = { invited: 'Приглашён', confirmed: 'Идёт', declined: 'Не идёт' }

const statusMeta = {
  invited:   { color: '#B45309', bg: '#FFFBEB' },
  confirmed: { color: '#047857', bg: '#ECFDF5' },
  declined:  { color: '#B91C1C', bg: '#FEF2F2' },
}

export default function ParticipantsTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const toast = useToast()
  const { isOpen, onToggle } = useDisclosure()
  const [email, setEmail] = useState('')

  const updateStatus = useUpdateParticipantStatus(event.id)
  const invite = useInviteParticipant(event.id)

  const isOrganizer = event.organizer.id === user?.id
  const myParticipant = event.participants.find(p => p.user.id === user?.id)

  const confirmed = event.participants.filter(p => p.status === 'confirmed').length
  const invited   = event.participants.filter(p => p.status === 'invited').length
  const declined  = event.participants.filter(p => p.status === 'declined').length

  function handleInvite() {
    if (!email.trim()) return
    invite.mutate(email.trim(), {
      onSuccess: () => {
        toast({ title: 'Приглашение отправлено', status: 'success', duration: 2000 })
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
      {/* My status */}
      {myParticipant && !isOrganizer && (
        <Box p={4} borderRadius="xl" bg="gray.50" border="1px solid" borderColor="gray.100">
          <Text fontSize="sm" fontWeight="500" color="gray.600" mb={3}>Ваш статус</Text>
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

      {/* Organizer actions */}
      {isOrganizer && (
        <HStack spacing={2}>
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
        </HStack>
      )}

      {/* Invite form */}
      <Collapse in={isOpen} animateOpacity>
        <Box p={4} borderRadius="xl" bg="gray.50" border="1px solid" borderColor="gray.100">
          <FormControl>
            <Text fontSize="xs" fontWeight="600" color="gray.500" mb={2}>Email участника</Text>
            <HStack spacing={2}>
              <Input
                size="sm"
                bg="white"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={onToggle} flexShrink={0}>Отмена</Button>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={handleInvite}
                isLoading={invite.isPending}
                flexShrink={0}
              >
                Пригласить
              </Button>
            </HStack>
          </FormControl>
        </Box>
      </Collapse>

      {/* Summary */}
      <HStack spacing={2} flexWrap="wrap">
        <Box px={2.5} py={1} borderRadius="md" bg="#ECFDF5">
          <Text fontSize="xs" fontWeight="600" color="#047857">{confirmed} идут</Text>
        </Box>
        <Box px={2.5} py={1} borderRadius="md" bg="#FFFBEB">
          <Text fontSize="xs" fontWeight="600" color="#B45309">{invited} приглашены</Text>
        </Box>
        {declined > 0 && (
          <Box px={2.5} py={1} borderRadius="md" bg="#FEF2F2">
            <Text fontSize="xs" fontWeight="600" color="#B91C1C">{declined} отказались</Text>
          </Box>
        )}
      </HStack>

      {/* List */}
      <VStack align="stretch" spacing={2}>
        {event.participants.map(p => {
          const meta = statusMeta[p.status]
          return (
            <HStack key={p.id} justify="space-between" p={3} borderRadius="lg" bg="gray.50">
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
                  <Text fontSize="xs" color="gray.400" noOfLines={1}>{p.user.email}</Text>
                </Box>
              </HStack>
              <Box px={2.5} py={1} borderRadius="md" bg={meta.bg} flexShrink={0}>
                <Text fontSize="xs" fontWeight="600" color={meta.color}>
                  {statusLabel[p.status]}
                </Text>
              </Box>
            </HStack>
          )
        })}
      </VStack>
    </VStack>
  )
}

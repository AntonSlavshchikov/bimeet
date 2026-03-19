import {
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Text,
  VStack,
  Icon,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Avatar,
  AvatarGroup,
} from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { FiCalendar, FiMapPin, FiUsers, FiPlus } from 'react-icons/fi'
import { useEvents } from '../store/eventsStore'
import { useAuth } from '../context/AuthContext'
import type { EventListItem } from '../api/events'

const CARD_GRADIENTS = [
  'linear(135deg, #7C3AED, #6366F1)',
  'linear(135deg, #0EA5E9, #6366F1)',
  'linear(135deg, #EC4899, #8B5CF6)',
  'linear(135deg, #10B981, #0EA5E9)',
  'linear(135deg, #F59E0B, #EF4444)',
]

function getGradient(id: string) {
  const idx = id.charCodeAt(id.length - 1) % CARD_GRADIENTS.length
  return CARD_GRADIENTS[idx]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const statusMeta = {
  invited: { label: 'Приглашён', color: '#F59E0B', bg: '#FFFBEB' },
  confirmed: { label: 'Иду', color: '#10B981', bg: '#ECFDF5' },
  declined: { label: 'Не иду', color: '#EF4444', bg: '#FEF2F2' },
}

function EventCard({ event, myStatus }: { event: EventListItem; myStatus?: string }) {
  const confirmedCount = event.participants.filter(p => p.status === 'confirmed').length
  const gradient = getGradient(event.id)
  const meta = myStatus ? statusMeta[myStatus as keyof typeof statusMeta] : null

  return (
    <Box
      as={Link}
      to={`/events/${event.id}`}
      display="block"
      bg="white"
      borderRadius="xl"
      overflow="hidden"
      border="1px solid"
      borderColor="rgba(0,0,0,0.07)"
      boxShadow="0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.08)',
        borderColor: 'rgba(0,0,0,0.09)',
      }}
      transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
    >
      {/* Gradient banner */}
      <Box
        h="3px"
        bgGradient={gradient}
      />

      <Box p={5}>
        <VStack align="stretch" spacing={4}>
          {/* Title row */}
          <HStack justify="space-between" align="flex-start">
            <Heading
              size="sm"
              noOfLines={2}
              letterSpacing="-0.2px"
              lineHeight="1.3"
              flex={1}
              mr={2}
            >
              {event.title}
            </Heading>
            {meta && (
              <Box
                px={2.5}
                py={1}
                borderRadius="full"
                bg={meta.bg}
                flexShrink={0}
              >
                <Text fontSize="xs" fontWeight="700" color={meta.color}>
                  {meta.label}
                </Text>
              </Box>
            )}
          </HStack>

          {event.description && (
            <Text fontSize="sm" color="gray.400" noOfLines={2} lineHeight="1.5">
              {event.description}
            </Text>
          )}

          {/* Meta info */}
          <VStack align="stretch" spacing={1.5}>
            <HStack spacing={2}>
              <Icon as={FiCalendar} color="brand.400" boxSize={3.5} />
              <Text fontSize="xs" color="gray.500" fontWeight="500">
                {formatDate(event.date_start)}, {formatTime(event.date_start)}
              </Text>
            </HStack>
            <HStack spacing={2}>
              <Icon as={FiMapPin} color="brand.400" boxSize={3.5} />
              <Text fontSize="xs" color="gray.500" fontWeight="500" noOfLines={1}>
                {event.location}
              </Text>
            </HStack>
          </VStack>

          {/* Footer */}
          <HStack justify="space-between" pt={2} borderTop="1px solid" borderColor="gray.50">
            <HStack spacing={1.5}>
              <Icon as={FiUsers} color="gray.300" boxSize={3.5} />
              <Text fontSize="xs" color="gray.400">{confirmedCount}</Text>
              <AvatarGroup size="xs" max={3} spacing="-6px">
                {event.participants
                  .filter(p => p.status === 'confirmed')
                  .map(p => (
                    <Avatar key={p.id} name={p.user.name} bg="brand.400" color="white" />
                  ))}
              </AvatarGroup>
            </HStack>
            <Text fontSize="xs" fontWeight="500" color="gray.300">
              →
            </Text>
          </HStack>
        </VStack>
      </Box>
    </Box>
  )
}

function EmptyState({ onAction, label }: { onAction?: string; label: string }) {
  return (
    <Box
      textAlign="center"
      py={16}
      px={8}
      bg="white"
      borderRadius="2xl"
      border="2px dashed"
      borderColor="gray.100"
    >
      <Box
        w="56px"
        h="56px"
        borderRadius="xl"
        bgGradient="linear(135deg, brand.50, brand.100)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        mx="auto"
        mb={4}
      >
        <Icon as={FiCalendar} color="brand.400" boxSize={6} />
      </Box>
      <Text fontWeight="600" color="gray.600" mb={1}>{label}</Text>
      {onAction && (
        <Button as={Link} to={onAction} colorScheme="blue" mt={4} size="sm">
          Создать встречу
        </Button>
      )}
    </Box>
  )
}

export default function EventsPage() {
  const events = useEvents()
  const { user } = useAuth()

  const myEvents = events.filter(e => e.organizer.id === user?.id)
  const invitedEvents = events.filter(e =>
    e.organizer.id !== user?.id &&
    e.participants.some(p => p.user.id === user?.id)
  )

  return (
    <Box>
      {/* Page header */}
      <HStack justify="space-between" mb={6} align="center">
        <Heading size="lg" color="gray.900">Встречи</Heading>
        <Button
          as={Link}
          to="/events/new"
          colorScheme="blue"
          leftIcon={<FiPlus />}
          size="sm"
        >
          Создать
        </Button>
      </HStack>

      <Tabs colorScheme="brand" variant="line">
        <TabList mb={6} borderColor="gray.100">
          <Tab
            pb={3}
            px={4}
            fontSize="sm"
            fontWeight="500"
            color="gray.400"
            _selected={{
              color: 'brand.600',
              fontWeight: '700',
              borderBottomColor: 'brand.500',
              borderBottomWidth: '2px',
            }}
          >
            Организую
            <Box
              as="span"
              ml={2}
              px={2}
              py={0.5}
              bg="brand.50"
              color="brand.600"
              borderRadius="full"
              fontSize="xs"
              fontWeight="700"
            >
              {myEvents.length}
            </Box>
          </Tab>
          <Tab
            pb={3}
            px={4}
            fontSize="sm"
            fontWeight="500"
            color="gray.400"
            _selected={{
              color: 'brand.600',
              fontWeight: '700',
              borderBottomColor: 'brand.500',
              borderBottomWidth: '2px',
            }}
          >
            Участвую
            <Box
              as="span"
              ml={2}
              px={2}
              py={0.5}
              bg="brand.50"
              color="brand.600"
              borderRadius="full"
              fontSize="xs"
              fontWeight="700"
            >
              {invitedEvents.length}
            </Box>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0} pt={0}>
            {myEvents.length === 0 ? (
              <EmptyState onAction="/events/new" label="У вас нет организуемых встреч" />
            ) : (
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
                gap={5}
              >
                {myEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </Grid>
            )}
          </TabPanel>
          <TabPanel px={0} pt={0}>
            {invitedEvents.length === 0 ? (
              <EmptyState label="Нет активных приглашений" />
            ) : (
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
                gap={5}
              >
                {invitedEvents.map(event => {
                  const myParticipant = event.participants.find(p => p.user.id === user?.id)
                  return (
                    <EventCard key={event.id} event={event} myStatus={myParticipant?.status ?? event.my_status} />
                  )
                })}
              </Grid>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}

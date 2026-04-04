import {
  Box,
  Heading,
  HStack,
  Text,
  VStack,
  Icon,
  Avatar,
  AvatarGroup,
  Badge,
} from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiCalendar, FiMapPin, FiUsers } from 'react-icons/fi'
import type { EventListItem } from '@/entities/event/model/types'
import { formatDate, formatTime } from '@/shared/lib/formatDate'

const CARD_GRADIENTS = [
  'linear(135deg, #4F46E5, #7C3AED)',   // Indigo → Violet
  'linear(135deg, #F43F5E, #A855F7)',   // Rose → Fuchsia
  'linear(135deg, #0891B2, #4F46E5)',   // Cyan → Indigo
  'linear(135deg, #059669, #0891B2)',   // Emerald → Teal
  'linear(135deg, #D97706, #E11D48)',   // Amber → Rose
]

const BUSINESS_GRADIENT = 'linear(135deg, #0F172A, #1E3A8A)'  // Deep Slate → Dark Blue

export function getGradient(id: string, category?: string) {
  if (category === 'business') return BUSINESS_GRADIENT
  const idx = id.charCodeAt(id.length - 1) % CARD_GRADIENTS.length
  return CARD_GRADIENTS[idx]
}

const statusScheme = {
  invited:   'yellow',
  confirmed: 'green',
  declined:  'red',
} as const

interface EventCardProps {
  event: EventListItem
  myStatus?: string
}

export default function EventCard({ event, myStatus }: EventCardProps) {
  const { t } = useTranslation()
  const confirmedCount = event.participants.filter(p => p.status === 'confirmed').length
  const gradient = getGradient(event.id, event.category)
  const statusKey = myStatus as keyof typeof statusScheme | undefined

  return (
    <Box
      as={Link}
      to={`/events/${event.id}`}
      display="block"
      bg="cardBg"
      borderRadius="xl"
      overflow="hidden"
      border="1px solid"
      borderColor="cardBorder"
      boxShadow="0 1px 3px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05)"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: '0 2px 8px rgba(15,23,42,0.06), 0 12px 32px rgba(15,23,42,0.09)',
        borderColor: 'defaultBorder',
      }}
      transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
    >
      <Box h="4px" bgGradient={gradient} />

      <Box p={5}>
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between" align="flex-start">
            <Box flex={1} mr={2}>
              <HStack mb={1} spacing={1.5} flexWrap="wrap">
                <Text
                  fontSize="10px"
                  fontWeight="600"
                  color={event.category === 'business' ? 'brand.700' : 'brand.500'}
                  textTransform="uppercase"
                  letterSpacing="0.1em"
                >
                  {event.category === 'business' ? t('eventCard.categoryBusiness') : t('eventCard.categoryOrdinary')}
                </Text>
                {event.status === 'completed' && (
                  <Badge colorScheme="gray" variant="subtle" fontSize="9px" borderRadius="md">
                    {t('eventCard.statusCompleted')}
                  </Badge>
                )}
              </HStack>
              <Heading
                size="sm"
                noOfLines={2}
                letterSpacing="-0.2px"
                lineHeight="1.3"
                opacity={event.status === 'completed' ? 0.6 : 1}
              >
                {event.title}
              </Heading>
            </Box>
            {statusKey && (
              <Badge
                colorScheme={statusScheme[statusKey]}
                variant="subtle"
                flexShrink={0}
                alignSelf="flex-start"
              >
                {t(`eventCard.status${statusKey.charAt(0).toUpperCase()}${statusKey.slice(1)}`)}
              </Badge>
            )}
          </HStack>

          {event.description && (
            <Text fontSize="sm" color="dimText" noOfLines={2} lineHeight="1.5">
              {event.description}
            </Text>
          )}

          <VStack align="stretch" spacing={1.5}>
            <HStack spacing={2}>
              <Icon as={FiCalendar} color="brand.400" boxSize={3.5} />
              <Text fontSize="xs" color="dimText" fontWeight="500">
                {formatDate(event.date_start)}, {formatTime(event.date_start)}
              </Text>
            </HStack>
            <HStack spacing={2}>
              <Icon as={FiMapPin} color="brand.400" boxSize={3.5} />
              <Text fontSize="xs" color="dimText" fontWeight="500" noOfLines={1}>
                {event.location}
              </Text>
            </HStack>
          </VStack>

          <HStack justify="space-between" pt={2} borderTop="1px solid" borderColor="subtleBorder">
            <HStack spacing={1.5}>
              <Icon as={FiUsers} color="faintText" boxSize={3.5} />
              <Text fontSize="xs" color="faintText">{confirmedCount}</Text>
              <AvatarGroup size="xs" max={3} spacing="-6px">
                {event.participants
                  .filter(p => p.status === 'confirmed')
                  .map(p => (
                    <Avatar key={p.id} name={p.user.name} bg="brand.400" color="white" />
                  ))}
              </AvatarGroup>
            </HStack>
            <Text fontSize="xs" fontWeight="500" color="faintText">→</Text>
          </HStack>
        </VStack>
      </Box>
    </Box>
  )
}

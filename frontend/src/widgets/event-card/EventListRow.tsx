import {
  Badge,
  Box,
  Button,
  HStack,
  Text,
  Icon,
  Avatar,
  AvatarGroup,
  Tooltip,
} from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiCalendar, FiChevronRight, FiGlobe, FiLock, FiMapPin } from 'react-icons/fi'
import type { EventListItem } from '@/entities/event/model/types'
import { formatDate, formatTime } from '@/shared/lib/formatDate'
import { getGradient } from './index'

const statusColors = {
  invited:   { color: '#F59E0B', bg: '#FFFBEB' },
  confirmed: { color: '#10B981', bg: '#ECFDF5' },
  declined:  { color: '#EF4444', bg: '#FEF2F2' },
}

interface EventListRowProps {
  event: EventListItem
  myStatus?: string
  canJoin?: boolean
  onJoin?: (e: React.MouseEvent) => void
}

export default function EventListRow({ event, myStatus, canJoin, onJoin }: EventListRowProps) {
  const { t } = useTranslation()
  const confirmedCount = event.confirmed_count ?? event.participants.filter(p => p.status === 'confirmed').length
  const gradient = getGradient(event.id, event.category)
  const statusKey = myStatus as keyof typeof statusColors | undefined
  const colors = statusKey ? statusColors[statusKey] : null

  return (
    <Box
      as={Link}
      to={`/events/${event.id}`}
      display="flex"
      alignItems="center"
      gap={4}
      px={4}
      py={3}
      bg="cardBg"
      borderRadius="xl"
      border="1px solid"
      borderColor="cardBorder"
      boxShadow="0 1px 3px rgba(15,23,42,0.03)"
      _hover={{
        borderColor: 'rgba(15,23,42,0.10)',
        boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
        bg: 'subtleBg',
      }}
      transition="all 0.15s"
      minH="60px"
    >
      {/* Gradient dot */}
      <Box
        w="8px"
        h="8px"
        borderRadius="full"
        bgGradient={gradient}
        flexShrink={0}
      />

      {/* Title + category */}
      <Box flex="2" minW={0}>
        <HStack mb={0.5} spacing={1.5}>
          <Text
            fontSize="xs"
            fontWeight="600"
            color={event.category === 'business' ? 'brand.700' : 'brand.500'}
            textTransform="uppercase"
            letterSpacing="0.08em"
          >
            {event.category === 'business' ? t('eventCard.categoryBusiness') : t('eventCard.categoryOrdinary')}
          </Text>
          {event.status === 'completed' && (
            <Badge colorScheme="gray" variant="subtle" fontSize="9px" borderRadius="md">
              {t('eventCard.statusCompleted')}
            </Badge>
          )}
          <Badge
            colorScheme={event.is_public ? 'teal' : 'purple'}
            variant="subtle"
            fontSize="9px"
            borderRadius="md"
            display="flex"
            alignItems="center"
            gap={0.5}
          >
            <Icon as={event.is_public ? FiGlobe : FiLock} boxSize={2.5} />
            {event.is_public ? t('eventCard.publicBadge') : t('eventCard.personalBadge')}
          </Badge>
        </HStack>
        <Text fontSize="sm" fontWeight="600" color="mainText" noOfLines={1} opacity={event.status === 'completed' ? 0.6 : 1}>
          {event.title}
        </Text>
      </Box>

      {/* Date */}
      <HStack spacing={1.5} flex="1" minW={0} display={{ base: 'none', md: 'flex' }}>
        <Icon as={FiCalendar} color="brand.400" boxSize={3.5} flexShrink={0} />
        <Text fontSize="xs" color="dimText" fontWeight="500" noOfLines={1}>
          {formatDate(event.date_start)}, {formatTime(event.date_start)}
        </Text>
      </HStack>

      {/* Location */}
      <HStack spacing={1.5} flex="1" minW={0} display={{ base: 'none', lg: 'flex' }}>
        <Icon as={FiMapPin} color="brand.400" boxSize={3.5} flexShrink={0} />
        <Text fontSize="xs" color="dimText" fontWeight="500" noOfLines={1}>
          {event.location}
        </Text>
      </HStack>

      {/* Status badge */}
      {colors && statusKey && (
        <Box px={2.5} py={1} borderRadius="full" bg={colors.bg} flexShrink={0}>
          <Text fontSize="xs" fontWeight="700" color={colors.color}>
            {t(`eventCard.status${statusKey.charAt(0).toUpperCase()}${statusKey.slice(1)}`)}
          </Text>
        </Box>
      )}

      {/* Participants */}
      <HStack spacing={1.5} flexShrink={0} display={{ base: 'none', sm: 'flex' }}>
        <Text fontSize="xs" color="faintText">{confirmedCount}</Text>
        <AvatarGroup size="xs" max={3} spacing="-6px">
          {event.participants
            .filter(p => p.status === 'confirmed')
            .map(p => (
              <Avatar key={p.id} name={p.user.name} bg="brand.400" color="white" />
            ))}
        </AvatarGroup>
      </HStack>

      {canJoin != null ? (
        <Tooltip label={!canJoin ? t('eventInfo.noSpots') : undefined} isDisabled={canJoin}>
          <Button
            size="xs"
            colorScheme="blue"
            isDisabled={!canJoin}
            flexShrink={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJoin?.(e) }}
          >
            {t('eventInfo.join')}
          </Button>
        </Tooltip>
      ) : (
        <Icon as={FiChevronRight} color="faintText" boxSize={4} flexShrink={0} />
      )}
    </Box>
  )
}

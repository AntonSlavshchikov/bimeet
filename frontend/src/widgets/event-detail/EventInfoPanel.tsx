import {
  Box,
  Heading,
  HStack,
  Text,
  VStack,
  Icon,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useDisclosure,
  Collapse,
  Badge,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import {
  FiCalendar,
  FiMapPin,
  FiMoreVertical,
  FiClock,
  FiBriefcase,
  FiTag,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi'
import type { Event } from '@/entities/event/model/types'
import { getGradient } from '@/widgets/event-card'
import { formatDate, formatTime } from '@/shared/lib/formatDate'

interface EventInfoPanelProps {
  event: Event
  isOrganizer: boolean
}

export default function EventInfoPanel({ event, isOrganizer }: EventInfoPanelProps) {
  const navigate = useNavigate()
  const { isOpen: isDescExpanded, onToggle: onDescToggle } = useDisclosure()
  const gradient = getGradient(event.id, event.category)
  const sameDay = formatDate(event.date_start) === formatDate(event.date_end)

  const descLong = (event.description ?? '').length > 120

  return (
    <Box
      bg="cardBg"
      borderRadius="xl"
      border="1px solid"
      borderColor="cardBorder"
      boxShadow="0 1px 3px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05)"
      overflow="hidden"
    >
      <Box h="4px" bgGradient={gradient} />

      <Box p={5}>
        <HStack justify="space-between" align="flex-start" mb={3}>
          <Box flex={1} minW={0}>
            <Text
              fontSize="10px"
              fontWeight="600"
              color={event.category === 'business' ? 'brand.700' : 'brand.500'}
              textTransform="uppercase"
              letterSpacing="0.1em"
              mb={1}
            >
              {event.category === 'business' ? 'Деловая встреча' : 'Обычная встреча'}
            </Text>
            <Heading size="md" letterSpacing="-0.3px" lineHeight="1.3">
              {event.title}
            </Heading>
          </Box>

          {isOrganizer && (
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FiMoreVertical />}
                variant="ghost"
                size="sm"
                aria-label="Действия"
                borderRadius="xl"
                color="faintText"
                _hover={{ bg: 'subtleBg', color: 'dimText' }}
                flexShrink={0}
              />
              <MenuList>
                <MenuItem fontSize="sm" onClick={() => navigate(`/events/${event.id}/edit`)}>
                  Редактировать
                </MenuItem>
              </MenuList>
            </Menu>
          )}
        </HStack>

        {event.description && (
          <Box mb={4}>
            <Collapse in={isDescExpanded} startingHeight={descLong ? '3.6em' : undefined}>
              <Text color="dimText" fontSize="sm" lineHeight="1.6">
                {event.description}
              </Text>
            </Collapse>
            {descLong && (
              <Text
                as="button"
                fontSize="xs"
                color="brand.500"
                fontWeight="500"
                mt={1}
                display="flex"
                alignItems="center"
                gap={0.5}
                onClick={onDescToggle}
                _hover={{ color: 'brand.600' }}
              >
                {isDescExpanded ? (
                  <><Icon as={FiChevronUp} /> Свернуть</>
                ) : (
                  <><Icon as={FiChevronDown} /> Подробнее</>
                )}
              </Text>
            )}
          </Box>
        )}

        <VStack align="stretch" spacing={2}>
          {sameDay ? (
            <>
              <HStack spacing={2.5}>
                <Box w="26px" h="26px" borderRadius="lg" bg="brand.50" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                  <Icon as={FiCalendar} color="brand.500" boxSize={3.5} />
                </Box>
                <Text fontSize="sm" color="dimText" fontWeight="500">{formatDate(event.date_start)}</Text>
              </HStack>
              <HStack spacing={2.5}>
                <Box w="26px" h="26px" borderRadius="lg" bg="brand.50" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                  <Icon as={FiClock} color="brand.500" boxSize={3.5} />
                </Box>
                <Text fontSize="sm" color="dimText" fontWeight="500">
                  {formatTime(event.date_start)} — {formatTime(event.date_end)}
                </Text>
              </HStack>
            </>
          ) : (
            <HStack spacing={2.5}>
              <Box w="26px" h="26px" borderRadius="lg" bg="brand.50" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                <Icon as={FiCalendar} color="brand.500" boxSize={3.5} />
              </Box>
              <Text fontSize="sm" color="dimText" fontWeight="500">
                {formatDate(event.date_start)}, {formatTime(event.date_start)} — {formatDate(event.date_end)}, {formatTime(event.date_end)}
              </Text>
            </HStack>
          )}

          <HStack spacing={2.5}>
            <Box w="26px" h="26px" borderRadius="lg" bg="brand.50" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
              <Icon as={FiMapPin} color="brand.500" boxSize={3.5} />
            </Box>
            <Text fontSize="sm" color="dimText" fontWeight="500">{event.location}</Text>
          </HStack>

          {event.dress_code && (
            <HStack spacing={2.5}>
              <Box w="26px" h="26px" borderRadius="lg" bg="brand.50" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                <Icon as={FiTag} color="brand.500" boxSize={3.5} />
              </Box>
              <Text fontSize="sm" color="dimText" fontWeight="500">Дресс-код: {event.dress_code}</Text>
            </HStack>
          )}

          {event.category === 'business' && (
            <HStack spacing={2.5}>
              <Box w="26px" h="26px" borderRadius="lg" bg="brand.50" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                <Icon as={FiBriefcase} color="brand.500" boxSize={3.5} />
              </Box>
              <Badge colorScheme="blue" variant="subtle" borderRadius="md" fontSize="xs">
                Деловая встреча
              </Badge>
            </HStack>
          )}
        </VStack>

        <Divider my={4} borderColor="subtleBorder" />

        <HStack spacing={2}>
          <Text fontSize="xs" color="faintText">Организатор:</Text>
          <Text fontSize="xs" fontWeight="600" color="dimText">{event.organizer.name}</Text>
        </HStack>
      </Box>
    </Box>
  )
}

import {
  Box,
  Button,
  Heading,
  HStack,
  Text,
  Badge,
  VStack,
  Icon,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Avatar,
} from '@chakra-ui/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiCalendar, FiMapPin, FiArrowLeft, FiMoreVertical, FiClock, FiUsers, FiPocket, FiBarChart2, FiShoppingBag, FiTruck } from 'react-icons/fi'
import { useEvent } from '../../store/eventsStore'
import { useAuth } from '../../context/AuthContext'
import ParticipantsTab from './tabs/ParticipantsTab'
import CollectionsTab from './tabs/CollectionsTab'
import PollsTab from './tabs/PollsTab'
import ItemsTab from './tabs/ItemsTab'
import CarpoolTab from './tabs/CarpoolTab'

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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const CARD_GRADIENTS = [
  'linear(135deg, #7C3AED, #6366F1)',
  'linear(135deg, #0EA5E9, #6366F1)',
  'linear(135deg, #EC4899, #8B5CF6)',
  'linear(135deg, #10B981, #0EA5E9)',
  'linear(135deg, #F59E0B, #EF4444)',
]

function getGradient(id: string) {
  return CARD_GRADIENTS[id.charCodeAt(id.length - 1) % CARD_GRADIENTS.length]
}

const tabs = [
  { label: 'Участники', icon: FiUsers },
  { label: 'Сборы',     icon: FiPocket },
  { label: 'Опросы',    icon: FiBarChart2 },
  { label: 'Вещи',      icon: FiShoppingBag },
  { label: 'Поездки',   icon: FiTruck },
]

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const event = useEvent(id!)
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!event) {
    return (
      <Box textAlign="center" py={20}>
        <Text color="gray.400" mb={4}>Встреча не найдена</Text>
        <Button as={Link} to="/events" colorScheme="blue">К списку</Button>
      </Box>
    )
  }

  const isOrganizer = event.organizer.id === user?.id
  const confirmedCount = event.participants.filter(p => p.status === 'confirmed').length
  const totalCollections = event.collections.reduce((s, c) => s + c.target_amount, 0)
  const gradient = getGradient(event.id)
  const allTabs = event.change_log.length > 0 ? [...tabs, { label: 'История', icon: FiClock }] : tabs

  return (
    <Box>
      {/* Back button */}
      <Button
        as={Link}
        to="/events"
        leftIcon={<FiArrowLeft />}
        variant="ghost"
        size="sm"
        color="gray.500"
        mb={5}
        _hover={{ color: 'brand.600', bg: 'brand.50' }}
      >
        Назад
      </Button>

      {/* Hero header */}
      <Box
        borderRadius="xl"
        overflow="hidden"
        bg="white"
        border="1px solid"
        borderColor="rgba(0,0,0,0.07)"
        boxShadow="0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)"
        mb={4}
      >
        {/* Gradient banner */}
        <Box h="3px" bgGradient={gradient} />

        <Box p={{ base: 4, sm: 6 }}>
          <HStack justify="space-between" align="flex-start">
            <Box flex={1}>
              <Heading size="lg" mb={2}>
                {event.title}
              </Heading>
              {event.description && (
                <Text color="gray.500" fontSize="sm" mb={4} lineHeight="1.6">
                  {event.description}
                </Text>
              )}

              <VStack align="stretch" spacing={2}>
                <HStack spacing={2.5}>
                  <Box
                    w="28px"
                    h="28px"
                    borderRadius="lg"
                    bg="brand.50"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={FiCalendar} color="brand.500" boxSize={3.5} />
                  </Box>
                  <Text fontSize="sm" color="gray.600" fontWeight="500">
                    {formatDate(event.date_start)}
                  </Text>
                </HStack>
                <HStack spacing={2.5}>
                  <Box
                    w="28px"
                    h="28px"
                    borderRadius="lg"
                    bg="brand.50"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={FiClock} color="brand.500" boxSize={3.5} />
                  </Box>
                  <Text fontSize="sm" color="gray.600" fontWeight="500">
                    {formatTime(event.date_start)} — {formatTime(event.date_end)}
                  </Text>
                </HStack>
                <HStack spacing={2.5}>
                  <Box
                    w="28px"
                    h="28px"
                    borderRadius="lg"
                    bg="brand.50"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={FiMapPin} color="brand.500" boxSize={3.5} />
                  </Box>
                  <Text fontSize="sm" color="gray.600" fontWeight="500">
                    {event.location}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {isOrganizer && (
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<FiMoreVertical />}
                  variant="ghost"
                  aria-label="Действия"
                  borderRadius="xl"
                  color="gray.400"
                  _hover={{ bg: 'gray.50', color: 'gray.700' }}
                />
                <MenuList>
                  <MenuItem
                    fontSize="sm"
                    onClick={() => navigate(`/events/${event.id}/edit`)}
                  >
                    Редактировать
                  </MenuItem>
                </MenuList>
              </Menu>
            )}
          </HStack>

          <Divider my={4} borderColor="gray.100" />

          {/* Stats row */}
          <HStack spacing={2} flexWrap="wrap" rowGap={2}>
            <HStack
              spacing={2}
              px={3}
              py={1.5}
              bg="brand.50"
              borderRadius="full"
            >
              <Icon as={FiUsers} color="brand.500" boxSize={3.5} />
              <Text fontSize="xs" fontWeight="700" color="brand.600">
                {confirmedCount} участников
              </Text>
            </HStack>

            {totalCollections > 0 && (
              <HStack spacing={2} px={3} py={1.5} bg="purple.50" borderRadius="full">
                <Icon as={FiPocket} color="purple.500" boxSize={3.5} />
                <Text fontSize="xs" fontWeight="700" color="purple.600">
                  {totalCollections.toLocaleString('ru-RU')} ₽
                </Text>
              </HStack>
            )}

            {event.polls.length > 0 && (
              <HStack spacing={2} px={3} py={1.5} bg="orange.50" borderRadius="full">
                <Icon as={FiBarChart2} color="orange.500" boxSize={3.5} />
                <Text fontSize="xs" fontWeight="700" color="orange.600">
                  {event.polls.length} опросов
                </Text>
              </HStack>
            )}

            <HStack spacing={2} px={3} py={1.5} bg="gray.50" borderRadius="full">
              <Avatar size="2xs" name={event.organizer.name} bg="brand.400" />
              <Text fontSize="xs" fontWeight="600" color="gray.500">
                {event.organizer.name}
              </Text>
            </HStack>
          </HStack>
        </Box>
      </Box>

      {/* Tabs card */}
      <Box
        bg="white"
        borderRadius="xl"
        border="1px solid"
        borderColor="rgba(0,0,0,0.07)"
        boxShadow="0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)"
        overflow="hidden"
      >
        <Tabs colorScheme="brand" isLazy>
          <TabList
            px={2}
            pt={1}
            borderBottom="1px solid"
            borderColor="gray.100"
            overflowX="auto"
            css={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
          >
            {allTabs.map(tab => (
              <Tab
                key={tab.label}
                px={4}
                py={3}
                fontSize="sm"
                fontWeight="500"
                color="gray.400"
                whiteSpace="nowrap"
                _selected={{
                  color: 'brand.600',
                  fontWeight: '700',
                  borderBottomColor: 'brand.500',
                  borderBottomWidth: '2px',
                }}
                _hover={{ color: 'gray.600' }}
              >
                <HStack spacing={1.5}>
                  <Icon as={tab.icon} boxSize={3.5} />
                  <Text>{tab.label}</Text>
                </HStack>
              </Tab>
            ))}
          </TabList>

          <TabPanels>
            <TabPanel p={{ base: 4, sm: 6 }}><ParticipantsTab event={event} /></TabPanel>
            <TabPanel p={{ base: 4, sm: 6 }}><CollectionsTab event={event} /></TabPanel>
            <TabPanel p={{ base: 4, sm: 6 }}><PollsTab event={event} /></TabPanel>
            <TabPanel p={{ base: 4, sm: 6 }}><ItemsTab event={event} /></TabPanel>
            <TabPanel p={{ base: 4, sm: 6 }}><CarpoolTab event={event} /></TabPanel>
            {event.change_log.length > 0 && (
              <TabPanel p={{ base: 4, sm: 6 }}>
                <VStack align="stretch" spacing={3}>
                  <Text fontSize="xs" fontWeight="600" color="gray.400" textTransform="uppercase" letterSpacing="0.06em">
                    История изменений
                  </Text>
                  {[...event.change_log].reverse().map(log => (
                    <Box
                      key={log.id}
                      p={3.5}
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="gray.100"
                      bg="gray.50"
                    >
                      <HStack spacing={2.5} mb={2} flexWrap="wrap">
                        <Avatar size="xs" name={log.changed_by.name} bg="brand.400" flexShrink={0} />
                        <Text fontSize="sm" fontWeight="500">{log.changed_by.name}</Text>
                        <Text fontSize="xs" color="gray.400">изменил «{log.field_name}»</Text>
                        <Text fontSize="xs" color="gray.400" ml="auto">{formatDateTime(log.changed_at)}</Text>
                      </HStack>
                      <HStack spacing={2} flexWrap="wrap">
                        <Badge colorScheme="red" variant="subtle" borderRadius="md">
                          {log.old_value}
                        </Badge>
                        <Text color="gray.300" fontSize="sm">→</Text>
                        <Badge colorScheme="green" variant="subtle" borderRadius="md">
                          {log.new_value}
                        </Badge>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  )
}

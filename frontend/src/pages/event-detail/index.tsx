import {
  Box,
  Button,
  Grid,
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
  Avatar,
} from '@chakra-ui/react'
import { Link, useParams } from 'react-router-dom'
import {
  FiClock,
  FiUsers,
  FiPocket,
  FiBarChart2,
  FiShoppingBag,
  FiTruck,
  FiLink,
} from 'react-icons/fi'
import { useEvent } from '@/entities/event/queries'
import { useAuth } from '@/features/auth/model/AuthContext'
import ParticipantsTab from '@/features/participants/ui/ParticipantsTab'
import CollectionsTab from '@/features/collections/ui/CollectionsTab'
import PollsTab from '@/features/polls/ui/PollsTab'
import ItemsTab from '@/features/items/ui/ItemsTab'
import CarpoolTab from '@/features/carpools/ui/CarpoolTab'
import LinksTab from '@/features/links/ui/LinksTab'
import EventInfoPanel from '@/widgets/event-detail/EventInfoPanel'
import ParticipantsSummaryPanel from '@/widgets/event-detail/ParticipantsSummaryPanel'
import { formatDateTime } from '@/shared/lib/formatDate'

const ORDINARY_TABS = [
  { label: 'Участники',    icon: FiUsers,       key: 'participants' },
  { label: 'Сбор средств', icon: FiPocket,      key: 'collections' },
  { label: 'Опросы',       icon: FiBarChart2,   key: 'polls' },
  { label: 'Вещи',         icon: FiShoppingBag, key: 'items' },
  { label: 'Попутчики',    icon: FiTruck,       key: 'carpools' },
]

const BUSINESS_TABS = [
  { label: 'Участники', icon: FiUsers,     key: 'participants' },
  { label: 'Опросы',    icon: FiBarChart2, key: 'polls' },
  { label: 'Ссылки',    icon: FiLink,      key: 'links' },
]

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const event = useEvent(id!)
  const { user } = useAuth()

  if (!event) {
    return (
      <Box textAlign="center" py={20}>
        <Text color="dimText" mb={4}>Встреча не найдена</Text>
        <Button as={Link} to="/events" colorScheme="blue">К списку</Button>
      </Box>
    )
  }

  const isOrganizer = event.organizer.id === user?.id

  const baseTabs = event.category === 'business' ? BUSINESS_TABS : ORDINARY_TABS
  const allTabs = event.change_log.length > 0
    ? [...baseTabs, { label: 'История', icon: FiClock, key: 'changelog' }]
    : baseTabs

  return (
    <Grid
      templateColumns={{ base: '1fr', lg: '320px 1fr' }}
      gap={5}
      alignItems="flex-start"
    >
      {/* Left panel — sticky on desktop */}
      <Box position={{ lg: 'sticky' }} top={{ lg: '64px' }}>
        <EventInfoPanel event={event} isOrganizer={isOrganizer} />
        <Box mt={4}>
          <ParticipantsSummaryPanel event={event} />
        </Box>
      </Box>

      {/* Right panel — tabs */}
      <Box
        bg="cardBg"
        borderRadius="xl"
        border="1px solid"
        borderColor="cardBorder"
        boxShadow="0 1px 3px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05)"
        overflow="hidden"
      >
        <Tabs colorScheme="brand" isLazy>
          <TabList
            px={2}
            pt={1}
            borderBottom="1px solid"
            borderColor="subtleBorder"
            overflowX={{ base: 'auto', lg: 'visible' }}
            css={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
          >
            {allTabs.map(tab => (
              <Tab
                key={tab.key}
                px={4}
                py={3}
                fontSize="sm"
                fontWeight="500"
                color="faintText"
                whiteSpace="nowrap"
                _selected={{ color: 'brand.600', fontWeight: '700', borderBottomColor: 'brand.500', borderBottomWidth: '2px' }}
                _hover={{ color: 'dimText' }}
              >
                <HStack spacing={1.5}>
                  <Icon as={tab.icon} boxSize={3.5} />
                  <Text>{tab.label}</Text>
                </HStack>
              </Tab>
            ))}
          </TabList>

          <TabPanels>
            {allTabs.map(tab => (
              <TabPanel key={tab.key} p={{ base: 4, sm: 6 }}>
                {tab.key === 'participants' && <ParticipantsTab event={event} />}
                {tab.key === 'collections' && <CollectionsTab event={event} />}
                {tab.key === 'polls' && <PollsTab event={event} />}
                {tab.key === 'items' && <ItemsTab event={event} />}
                {tab.key === 'carpools' && <CarpoolTab event={event} />}
                {tab.key === 'links' && <LinksTab event={event} />}
                {tab.key === 'changelog' && (
                  <VStack align="stretch" spacing={3}>
                    <Text fontSize="xs" fontWeight="600" color="faintText" textTransform="uppercase" letterSpacing="0.06em">
                      История изменений
                    </Text>
                    {[...event.change_log].reverse().map(log => (
                      <Box
                        key={log.id}
                        p={3.5}
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="subtleBorder"
                        bg="subtleBg"
                      >
                        <HStack spacing={2.5} mb={2} flexWrap="wrap">
                          <Avatar size="xs" name={log.changed_by.name} bg="brand.400" flexShrink={0} />
                          <Text fontSize="sm" fontWeight="500">{log.changed_by.name}</Text>
                          <Text fontSize="xs" color="faintText">изменил «{log.field_name}»</Text>
                          <Text fontSize="xs" color="faintText" ml="auto">{formatDateTime(log.changed_at)}</Text>
                        </HStack>
                        <HStack spacing={2} flexWrap="wrap">
                          <Badge colorScheme="red" variant="subtle" borderRadius="md">{log.old_value}</Badge>
                          <Text color="faintText" fontSize="sm">→</Text>
                          <Badge colorScheme="green" variant="subtle" borderRadius="md">{log.new_value}</Badge>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                )}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Box>
    </Grid>
  )
}

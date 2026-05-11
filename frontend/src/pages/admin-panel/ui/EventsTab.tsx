import {
  Badge,
  Box,
  Heading,
  Skeleton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { useAdminRecentEvents } from '@/entities/admin-stats/queries'
import { formatDate } from '@/shared/lib/formatDate'

export default function EventsTab() {
  const { t } = useTranslation()
  const recent = useAdminRecentEvents(20)

  return (
    <Box
      bg="cardBg"
      borderWidth="1px"
      borderColor="cardBorder"
      borderRadius="lg"
      p={5}
    >
      <Heading size="sm" mb={4} color="mainText">
        {t('admin.events.recent')}
      </Heading>
      {recent.isLoading ? (
        <VStack align="stretch" spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} h="36px" borderRadius="md" />
          ))}
        </VStack>
      ) : (recent.data?.length ?? 0) === 0 ? (
        <Text color="dimText" fontSize="sm">
          {t('admin.empty')}
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>{t('admin.events.title')}</Th>
                <Th>{t('admin.events.category')}</Th>
                <Th>{t('admin.events.status')}</Th>
                <Th>{t('admin.events.visibility')}</Th>
                <Th>{t('admin.events.organizer')}</Th>
                <Th>{t('admin.events.dateStart')}</Th>
                <Th>{t('admin.events.createdAt')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {recent.data?.map((ev) => (
                <Tr key={ev.id}>
                  <Td>
                    <RouterLink to={`/events/${ev.id}`}>
                      <Text color="brand.600" fontWeight={500} noOfLines={1}>
                        {ev.title}
                      </Text>
                    </RouterLink>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={ev.category === 'business' ? 'purple' : 'blue'}
                      variant="subtle"
                    >
                      {t(`admin.events.category_${ev.category}`)}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={ev.status === 'completed' ? 'gray' : 'green'}
                      variant="subtle"
                    >
                      {t(`admin.events.status_${ev.status}`)}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={ev.is_public ? 'green' : 'gray'} variant="subtle">
                      {ev.is_public
                        ? t('admin.events.visibility_public')
                        : t('admin.events.visibility_private')}
                    </Badge>
                  </Td>
                  <Td color="dimText" maxW="220px">
                    <Text noOfLines={1}>{ev.organizer_email}</Text>
                  </Td>
                  <Td color="dimText">{formatDate(ev.date_start)}</Td>
                  <Td color="faintText">{formatDate(ev.created_at)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  )
}

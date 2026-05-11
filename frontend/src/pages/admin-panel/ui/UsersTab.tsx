import {
  Box,
  Heading,
  Skeleton,
  Stack,
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
import {
  useAdminRecentUsers,
  useAdminTopOrganizers,
} from '@/entities/admin-stats/queries'
import { formatDate } from '@/shared/lib/formatDate'

export default function UsersTab() {
  const { t } = useTranslation()
  const recent = useAdminRecentUsers(20)
  const top = useAdminTopOrganizers(10)

  return (
    <Stack direction={{ base: 'column', xl: 'row' }} spacing={6} align="stretch">
      <Box
        flex={2}
        bg="cardBg"
        borderWidth="1px"
        borderColor="cardBorder"
        borderRadius="lg"
        p={5}
      >
        <Heading size="sm" mb={4} color="mainText">
          {t('admin.users.recent')}
        </Heading>
        {recent.isLoading ? (
          <VStack align="stretch" spacing={2}>
            {Array.from({ length: 6 }).map((_, i) => (
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
                  <Th>{t('admin.users.name')}</Th>
                  <Th>{t('admin.users.email')}</Th>
                  <Th>{t('admin.users.city')}</Th>
                  <Th>{t('admin.users.createdAt')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {recent.data?.map((u) => (
                  <Tr key={u.id}>
                    <Td>
                      <Text fontWeight={500} color="mainText">
                        {[u.name, u.last_name].filter(Boolean).join(' ') || '—'}
                      </Text>
                    </Td>
                    <Td color="dimText">{u.email}</Td>
                    <Td color="dimText">{u.city || '—'}</Td>
                    <Td color="faintText">{formatDate(u.created_at)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <Box
        flex={1}
        bg="cardBg"
        borderWidth="1px"
        borderColor="cardBorder"
        borderRadius="lg"
        p={5}
      >
        <Heading size="sm" mb={4} color="mainText">
          {t('admin.users.topOrganizers')}
        </Heading>
        {top.isLoading ? (
          <VStack align="stretch" spacing={2}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} h="32px" borderRadius="md" />
            ))}
          </VStack>
        ) : (top.data?.length ?? 0) === 0 ? (
          <Text color="dimText" fontSize="sm">
            {t('admin.empty')}
          </Text>
        ) : (
          <VStack align="stretch" spacing={2}>
            {top.data?.map((o, idx) => (
              <Box
                key={o.user_id}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                px={3}
                py={2}
                borderRadius="md"
                bg="subtleBg"
              >
                <Box minW={0}>
                  <Text fontWeight={500} color="mainText" noOfLines={1}>
                    {idx + 1}. {o.name || o.email}
                  </Text>
                  <Text fontSize="xs" color="faintText" noOfLines={1}>
                    {o.email}
                  </Text>
                </Box>
                <Text fontWeight={600} color="brand.600" ml={3} flexShrink={0}>
                  {o.event_count}
                </Text>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </Stack>
  )
}

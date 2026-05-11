import {
  Box,
  Container,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import OverviewTab from '@/pages/admin-panel/ui/OverviewTab'
import UsersTab from '@/pages/admin-panel/ui/UsersTab'
import EventsTab from '@/pages/admin-panel/ui/EventsTab'

export default function AdminPanelPage() {
  const { t } = useTranslation()

  return (
    <Container maxW="7xl" py={{ base: 4, md: 6 }}>
      <Box mb={6}>
        <Heading size="lg" color="mainText">
          {t('admin.title')}
        </Heading>
        <Text color="dimText" mt={1} fontSize="sm">
          {t('admin.subtitle')}
        </Text>
      </Box>

      <Tabs colorScheme="blue" variant="line" isLazy>
        <TabList borderColor="subtleBorder" mb={6}>
          <Tab>{t('admin.tabs.overview')}</Tab>
          <Tab>{t('admin.tabs.users')}</Tab>
          <Tab>{t('admin.tabs.events')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0} pt={0}>
            <OverviewTab />
          </TabPanel>
          <TabPanel px={0} pt={0}>
            <UsersTab />
          </TabPanel>
          <TabPanel px={0} pt={0}>
            <EventsTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
}

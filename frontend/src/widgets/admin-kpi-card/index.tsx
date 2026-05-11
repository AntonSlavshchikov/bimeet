import { Box, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import type { ElementType, ReactNode } from 'react'

interface AdminKpiCardProps {
  label: string
  value: ReactNode
  icon?: ElementType
  hint?: string
}

export default function AdminKpiCard({ label, value, icon, hint }: AdminKpiCardProps) {
  return (
    <Box
      bg="cardBg"
      borderWidth="1px"
      borderColor="cardBorder"
      borderRadius="lg"
      p={4}
    >
      <HStack align="start" justify="space-between" spacing={3}>
        <VStack align="start" spacing={1} minW={0}>
          <Text fontSize="xs" color="dimText" textTransform="uppercase" letterSpacing="0.04em">
            {label}
          </Text>
          <Text fontSize="2xl" fontWeight="700" color="mainText" lineHeight={1.1}>
            {value}
          </Text>
          {hint && (
            <Text fontSize="xs" color="faintText">
              {hint}
            </Text>
          )}
        </VStack>
        {icon && (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            w={9}
            h={9}
            borderRadius="md"
            bg="subtleBg"
            color="brand.600"
            flexShrink={0}
          >
            <Icon as={icon} boxSize={5} />
          </Box>
        )}
      </HStack>
    </Box>
  )
}

import {
  Box,
  Flex,
  HStack,
  Text,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Container,
} from '@chakra-ui/react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <Box minH="100vh" bg="#F5F5F7">
      {/* Navbar */}
      <Box
        position="sticky"
        top={0}
        zIndex={100}
        backdropFilter="blur(20px) saturate(1.8)"
        bg="rgba(255, 255, 255, 0.82)"
        borderBottom="1px solid"
        borderColor="rgba(0,0,0,0.07)"
        boxShadow="0 1px 0 rgba(0,0,0,0.04)"
      >
        <Container maxW="container.xl">
          <Flex h="56px" align="center" justify="space-between">
            <Link to="/events">
              <HStack spacing={2}>
                <Box
                  w="26px"
                  h="26px"
                  borderRadius="md"
                  bg="brand.600"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="11px" lineHeight={1} color="white">✦</Text>
                </Box>
                <Text
                  fontSize="md"
                  fontWeight="600"
                  color="gray.900"
                  letterSpacing="-0.3px"
                >
                  MeetUp
                </Text>
              </HStack>
            </Link>

            {user && (
              <HStack spacing={2.5}>
                <Menu>
                  <MenuButton
                    as={Box}
                    cursor="pointer"
                    borderRadius="full"
                    transition="all 0.2s"
                    _hover={{ opacity: 0.85 }}
                  >
                    <Avatar
                      size="sm"
                      name={user.name}
                      bg="brand.600"
                      color="white"
                      fontWeight="600"
                    />
                  </MenuButton>
                  <MenuList minW="200px">
                    <Box px={3} py={2.5} mb={1}>
                      <Text fontWeight="600" fontSize="sm" color="gray.900">{user.name}</Text>
                      <Text fontSize="xs" color="gray.400" mt={0.5}>{user.email}</Text>
                    </Box>
                    <Box h="1px" bg="gray.100" mx={2} mb={1} />
                    <MenuItem onClick={handleLogout} color="red.500" fontSize="sm">
                      Выйти
                    </MenuItem>
                  </MenuList>
                </Menu>
              </HStack>
            )}
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl" py={{ base: 5, sm: 7 }} px={{ base: 4, sm: 6, md: 8 }}>
        {children}
      </Container>
    </Box>
  )
}

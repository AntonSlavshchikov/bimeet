import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Link as ChakraLink,
  useToast,
  HStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/model/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('andrey@example.com')
  const [password, setPassword] = useState('password')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const ok = await login(email, password)
    setLoading(false)
    if (ok) {
      navigate('/events')
    } else {
      toast({ title: 'Ошибка входа', status: 'error', duration: 3000 })
    }
  }

  return (
    <Box minH="100vh" display="flex" position="relative" overflow="hidden">
      <Box position="absolute" inset={0} bg="pageBg" />
      <Box
        position="absolute"
        top="-160px"
        left="-160px"
        w="480px"
        h="480px"
        borderRadius="full"
        bgGradient="radial(#C7D2FE, transparent)"
        opacity={0.5}
        filter="blur(80px)"
      />
      <Box
        position="absolute"
        bottom="-140px"
        right="-140px"
        w="420px"
        h="420px"
        borderRadius="full"
        bgGradient="radial(#A5B4FC, transparent)"
        opacity={0.3}
        filter="blur(100px)"
      />

      <Box
        position="relative"
        zIndex={1}
        w="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
      >
        <Box w="full" maxW="380px">
          <VStack spacing={7} align="stretch">
            <VStack spacing={1.5} align="center">
              <HStack spacing={2}>
                <Box
                  w="28px" h="28px" borderRadius="md" bg="brand.600"
                  display="flex" alignItems="center" justifyContent="center"
                >
                  <Text fontSize="12px" lineHeight={1} color="white">✦</Text>
                </Box>
                <Text fontSize="lg" fontWeight="600" color="gray.900" letterSpacing="-0.3px">MeetUp</Text>
              </HStack>
              <Text color="gray.400" fontSize="sm">Организуйте встречи легко</Text>
            </VStack>

            <Box
              bg="cardBg"
              borderRadius="xl"
              p={7}
              boxShadow="0 2px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)"
              border="1px solid"
              borderColor="cardBorder"
            >
              <VStack spacing={5} as="form" onSubmit={handleSubmit}>
                <Box w="full">
                  <Heading size="md" mb={1}>Добро пожаловать</Heading>
                  <Text fontSize="sm" color="gray.400">Войдите в свой аккаунт</Text>
                </Box>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    size="md"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Пароль</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    size="md"
                  />
                </FormControl>

                <Button type="submit" colorScheme="blue" w="full" size="md" isLoading={loading} mt={1}>
                  Войти
                </Button>

                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Нет аккаунта?{' '}
                  <ChakraLink
                    as={Link}
                    to="/register"
                    color="brand.600"
                    fontWeight="600"
                    _hover={{ textDecoration: 'none', color: 'brand.700' }}
                  >
                    Зарегистрироваться
                  </ChakraLink>
                </Text>
              </VStack>
            </Box>

            <Text fontSize="xs" color="gray.400" textAlign="center">
              Demo: любой email/пароль для входа
            </Text>
          </VStack>
        </Box>
      </Box>
    </Box>
  )
}

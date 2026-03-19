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
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !password) {
      toast({ title: 'Заполните все поля', status: 'warning', duration: 3000 })
      return
    }
    setLoading(true)
    const ok = await register(name, email, password)
    setLoading(false)
    if (ok) {
      navigate('/events')
    } else {
      toast({ title: 'Ошибка регистрации', status: 'error', duration: 3000 })
    }
  }

  return (
    <Box minH="100vh" display="flex" position="relative" overflow="hidden">
      <Box
        position="absolute"
        inset={0}
        bg="#F5F5F7"
      />
      <Box
        position="absolute"
        top="-160px"
        right="-160px"
        w="480px"
        h="480px"
        borderRadius="full"
        bgGradient="radial(brand.200, transparent)"
        opacity={0.25}
        filter="blur(80px)"
      />
      <Box
        position="absolute"
        bottom="-140px"
        left="-140px"
        w="420px"
        h="420px"
        borderRadius="full"
        bgGradient="radial(#818CF8, transparent)"
        opacity={0.18}
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
                  w="28px"
                  h="28px"
                  borderRadius="md"
                  bg="brand.600"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="12px" lineHeight={1} color="white">✦</Text>
                </Box>
                <Text
                  fontSize="lg"
                  fontWeight="600"
                  color="gray.900"
                  letterSpacing="-0.3px"
                >
                  MeetUp
                </Text>
              </HStack>
              <Text color="gray.400" fontSize="sm">Организуйте встречи легко</Text>
            </VStack>

            <Box
              bg="white"
              borderRadius="xl"
              p={7}
              boxShadow="0 2px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)"
              border="1px solid"
              borderColor="rgba(0,0,0,0.07)"
            >
              <VStack spacing={5} as="form" onSubmit={handleSubmit}>
                <Box w="full">
                  <Heading size="md" mb={1}>Создать аккаунт</Heading>
                  <Text fontSize="sm" color="gray.400">Начните организовывать встречи</Text>
                </Box>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Имя</FormLabel>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Иван Иванов"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Пароль</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  w="full"
                  size="md"
                  isLoading={loading}
                  mt={1}
                >
                  Зарегистрироваться
                </Button>

                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Уже есть аккаунт?{' '}
                  <ChakraLink
                    as={Link}
                    to="/login"
                    color="brand.600"
                    fontWeight="600"
                    _hover={{ textDecoration: 'none', color: 'brand.700' }}
                  >
                    Войти
                  </ChakraLink>
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </Box>
    </Box>
  )
}

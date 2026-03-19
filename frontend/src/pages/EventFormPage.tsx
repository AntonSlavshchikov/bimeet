import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  Heading,
  HStack,
  useToast,
  Text,
  SimpleGrid,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCreateEvent, useUpdateEvent, useEvent } from '../store/eventsStore'
import { FiArrowLeft } from 'react-icons/fi'
import { Link } from 'react-router-dom'

interface FormValues {
  title: string
  description: string
  dateStart: string
  dateEnd: string
  location: string
}

function toDatetimeLocal(iso: string) {
  if (!iso) return ''
  return iso.slice(0, 16)
}

export default function EventFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()

  const event = useEvent(id ?? '')
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent(id ?? '')

  const [form, setForm] = useState<FormValues>({
    title: '',
    description: '',
    dateStart: '',
    dateEnd: '',
    location: '',
  })

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        description: event.description,
        dateStart: toDatetimeLocal(event.date_start),
        dateEnd: toDatetimeLocal(event.date_end),
        location: event.location,
      })
    }
  }, [event])

  function handleChange(field: keyof FormValues, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.dateStart || !form.location) {
      toast({ title: 'Заполните обязательные поля', status: 'warning', duration: 3000 })
      return
    }

    const payload = {
      title: form.title,
      description: form.description,
      date_start: new Date(form.dateStart).toISOString(),
      date_end: new Date(form.dateEnd).toISOString(),
      location: form.location,
    }

    if (isEdit && id) {
      updateEvent.mutate(payload, {
        onSuccess: () => {
          toast({ title: 'Встреча обновлена', status: 'success', duration: 2000 })
          navigate(`/events/${id}`)
        },
        onError: (err) => {
          toast({ title: 'Ошибка обновления', description: err.message, status: 'error', duration: 3000 })
        },
      })
    } else {
      createEvent.mutate(payload, {
        onSuccess: (newEvent) => {
          toast({ title: 'Встреча создана', status: 'success', duration: 2000 })
          navigate(`/events/${newEvent.id}`)
        },
        onError: (err) => {
          toast({ title: 'Ошибка создания', description: err.message, status: 'error', duration: 3000 })
        },
      })
    }
  }

  const isLoading = createEvent.isPending || updateEvent.isPending

  return (
    <Box maxW="600px" mx="auto">
      <Button
        as={Link}
        to={isEdit && id ? `/events/${id}` : '/events'}
        leftIcon={<FiArrowLeft />}
        variant="ghost"
        size="sm"
        color="gray.500"
        mb={6}
        _hover={{ color: 'brand.600', bg: 'brand.50' }}
      >
        Назад
      </Button>

      <Box mb={6}>
        <Heading size="lg">
          {isEdit ? 'Изменить детали' : 'Создать встречу'}
        </Heading>
        <Text fontSize="sm" color="gray.400" mt={1}>
          {isEdit ? 'Редактирование встречи' : 'Новое мероприятие'}
        </Text>
      </Box>

      <Box
        bg="white"
        borderRadius="xl"
        border="1px solid"
        borderColor="rgba(0,0,0,0.07)"
        boxShadow="0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)"
        overflow="hidden"
      >
        {/* Accent top bar */}
        <Box h="3px" bgGradient="linear(135deg, brand.500, #6366F1)" />

        <Box p={{ base: 4, sm: 6 }}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="500" color="gray.600">Название</FormLabel>
                <Input
                  value={form.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="Например: День рождения Ивана"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="500" color="gray.600">Описание</FormLabel>
                <Textarea
                  value={form.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="Расскажите подробности..."
                  rows={3}
                  resize="none"
                />
              </FormControl>

              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3} w="full">
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" color="gray.600">Начало</FormLabel>
                  <Input
                    type="datetime-local"
                    value={form.dateStart}
                    onChange={e => handleChange('dateStart', e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="500" color="gray.600">Конец</FormLabel>
                  <Input
                    type="datetime-local"
                    value={form.dateEnd}
                    onChange={e => handleChange('dateEnd', e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="500" color="gray.600">Место</FormLabel>
                <Input
                  value={form.location}
                  onChange={e => handleChange('location', e.target.value)}
                  placeholder="Адрес или название места"
                />
              </FormControl>

              <HStack w="full" justify="flex-end" spacing={2} pt={1}>
                <Button variant="ghost" onClick={() => navigate(-1)}>
                  Отмена
                </Button>
                <Button type="submit" colorScheme="blue" px={6} isLoading={isLoading}>
                  {isEdit ? 'Сохранить' : 'Создать'}
                </Button>
              </HStack>
            </VStack>
          </form>
        </Box>
      </Box>

      {!isEdit && (
        <Text fontSize="xs" color="gray.400" mt={4} textAlign="center">
          После создания можно добавить участников, расходы и опросы
        </Text>
      )}
    </Box>
  )
}

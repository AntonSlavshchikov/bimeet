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
  RadioGroup,
  Radio,
  Stack,
  Divider,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useEvent } from '@/entities/event/queries'
import { useCreateEvent, useUpdateEvent } from '@/features/event-manage/model/hooks'
import type { EventCategory } from '@/entities/event/model/types'

interface FormValues {
  title: string
  description: string
  dateStart: string
  dateEnd: string
  location: string
  category: EventCategory
  dressCode: string
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
    category: 'ordinary',
    dressCode: '',
  })

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        description: event.description,
        dateStart: toDatetimeLocal(event.date_start),
        dateEnd: toDatetimeLocal(event.date_end),
        location: event.location,
        category: event.category ?? 'ordinary',
        dressCode: event.dress_code ?? '',
      })
    }
  }, [event])

  function handleChange(field: keyof FormValues, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.title || !form.dateStart || !form.dateEnd || !form.location) {
      toast({ title: 'Заполните обязательные поля', status: 'warning', duration: 3000 })
      return
    }

    const payload = {
      title: form.title,
      description: form.description,
      date_start: new Date(form.dateStart).toISOString(),
      date_end: new Date(form.dateEnd).toISOString(),
      location: form.location,
      category: form.category,
      ...(form.dressCode.trim() ? { dress_code: form.dressCode.trim() } : {}),
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
    <Box maxW="860px" mx="auto">
      <Button
        as={Link}
        to={isEdit && id ? `/events/${id}` : '/events'}
        leftIcon={<FiArrowLeft />}
        variant="ghost"
        size="sm"
        color="dimText"
        mb={6}
        _hover={{ color: 'brand.600', bg: 'brand.50' }}
      >
        Назад
      </Button>

      <Box mb={6}>
        <Heading size="lg">{isEdit ? 'Изменить детали' : 'Создать встречу'}</Heading>
        <Text fontSize="sm" color="dimText" mt={1}>
          {isEdit ? 'Редактирование встречи' : 'Новое мероприятие'}
        </Text>
      </Box>

      <Box
        bg="cardBg"
        borderRadius="xl"
        border="1px solid"
        borderColor="cardBorder"
        boxShadow="0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)"
        overflow="hidden"
      >
        <Box h="4px" bgGradient="linear(135deg, brand.600, #7C3AED)" />

        <form onSubmit={handleSubmit}>
          <Box p={{ base: 4, sm: 6 }}>
            {/* Тип встречи — full width */}
            <Box mb={6}>
              <Text fontSize="xs" fontWeight="600" color="faintText" textTransform="uppercase" letterSpacing="0.08em" mb={3}>
                Тип встречи
              </Text>
              <FormControl isRequired>
                <RadioGroup value={form.category} onChange={(val) => handleChange('category', val)}>
                  <Stack direction={{ base: 'column', sm: 'row' }} spacing={4}>
                    <Radio value="ordinary" colorScheme="blue">
                      <VStack align="flex-start" spacing={0}>
                        <Text fontSize="sm" fontWeight="500">Обычная</Text>
                        <Text fontSize="xs" color="dimText">Праздник, выезд, поход</Text>
                      </VStack>
                    </Radio>
                    <Radio value="business" colorScheme="blue">
                      <VStack align="flex-start" spacing={0}>
                        <Text fontSize="sm" fontWeight="500">Деловая</Text>
                        <Text fontSize="xs" color="dimText">Совещание, созвон, переговоры</Text>
                      </VStack>
                    </Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>
            </Box>

            <Divider borderColor="subtleBorder" mb={6} />

            {/* Two-column layout on md+ */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {/* Left column: main info */}
              <VStack spacing={4} align="stretch">
                <Text fontSize="xs" fontWeight="600" color="faintText" textTransform="uppercase" letterSpacing="0.08em">
                  Основная информация
                </Text>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" color="dimText">Название</FormLabel>
                  <Input
                    value={form.title}
                    onChange={e => handleChange('title', e.target.value)}
                    placeholder="Например: День рождения Ивана"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="500" color="dimText">Описание</FormLabel>
                  <Textarea
                    value={form.description}
                    onChange={e => handleChange('description', e.target.value)}
                    placeholder="Расскажите подробности..."
                    rows={4}
                    resize="none"
                  />
                </FormControl>
              </VStack>

              {/* Right column: when & where */}
              <VStack spacing={4} align="stretch">
                <Text fontSize="xs" fontWeight="600" color="faintText" textTransform="uppercase" letterSpacing="0.08em">
                  Когда и где
                </Text>

                <SimpleGrid columns={2} spacing={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm" fontWeight="500" color="dimText">Начало</FormLabel>
                    <Input
                      type="datetime-local"
                      value={form.dateStart}
                      onChange={e => handleChange('dateStart', e.target.value)}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm" fontWeight="500" color="dimText">Конец</FormLabel>
                    <Input
                      type="datetime-local"
                      value={form.dateEnd}
                      onChange={e => handleChange('dateEnd', e.target.value)}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" color="dimText">Место</FormLabel>
                  <Input
                    value={form.location}
                    onChange={e => handleChange('location', e.target.value)}
                    placeholder={form.category === 'business' ? 'Адрес офиса или онлайн' : 'Адрес или название места'}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="500" color="dimText">
                    Дресс-код
                    <Text as="span" fontSize="xs" color="faintText" fontWeight="400" ml={2}>(необязательно)</Text>
                  </FormLabel>
                  <Input
                    value={form.dressCode}
                    onChange={e => handleChange('dressCode', e.target.value)}
                    placeholder="Smart casual, Деловой, Свободный..."
                  />
                </FormControl>
              </VStack>
            </SimpleGrid>
          </Box>

          {/* Sticky submit bar */}
          <Box
            borderTop="1px solid"
            borderColor="subtleBorder"
            px={{ base: 4, sm: 6 }}
            py={4}
            bg="cardBg"
          >
            <HStack justify="space-between" align="center">
              {!isEdit && (
                <Text fontSize="xs" color="faintText">
                  После создания можно добавить участников и другие детали
                </Text>
              )}
              <HStack spacing={2} ml="auto">
                <Button variant="ghost" onClick={() => navigate(-1)}>Отмена</Button>
                <Button type="submit" colorScheme="blue" px={8} isLoading={isLoading}>
                  {isEdit ? 'Сохранить' : 'Создать'}
                </Button>
              </HStack>
            </HStack>
          </Box>
        </form>
      </Box>
    </Box>
  )
}

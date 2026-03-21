import {
  Box,
  Button,
  Collapse,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Link,
  Text,
  VStack,
  IconButton,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FiLink, FiExternalLink, FiPlus, FiTrash2 } from 'react-icons/fi'
import { useAddLink, useRemoveLink } from '@/features/links/model/hooks'
import { useAuth } from '@/features/auth/model/AuthContext'
import type { Event } from '@/entities/event/model/types'

export default function LinksTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const toast = useToast()
  const { isOpen, onToggle } = useDisclosure()
  const addLink = useAddLink(event.id)
  const removeLink = useRemoveLink(event.id)

  const isOrganizer = event.organizer.id === user?.id
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

  function handleAdd() {
    if (!title.trim() || !url.trim()) {
      toast({ title: 'Заполните название и ссылку', status: 'warning', duration: 2500 })
      return
    }
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    addLink.mutate({ title: title.trim(), url: fullUrl }, {
      onSuccess: () => {
        setTitle('')
        setUrl('')
        onToggle()
      },
      onError: (err) => {
        toast({ title: 'Ошибка', description: err.message, status: 'error', duration: 3000 })
      },
    })
  }

  function handleCancel() {
    setTitle('')
    setUrl('')
    onToggle()
  }

  function handleDelete(linkId: string) {
    removeLink.mutate(linkId, {
      onError: (err) => {
        toast({ title: 'Ошибка удаления', description: err.message, status: 'error', duration: 3000 })
      },
    })
  }

  const links = event.links ?? []

  return (
    <VStack align="stretch" spacing={5}>
      <HStack justify="space-between">
        <Text fontSize="xs" fontWeight="600" color="faintText" textTransform="uppercase" letterSpacing="0.06em">
          Ссылки
        </Text>
        {isOrganizer && (
          <Button size="sm" leftIcon={<FiPlus />} colorScheme="blue" variant="outline" onClick={onToggle}>
            Добавить
          </Button>
        )}
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <Box p={4} borderRadius="xl" bg="subtleBg" border="1px solid" borderColor="subtleBorder">
          <VStack spacing={3}>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="dimText">Название</FormLabel>
              <Input
                size="sm"
                bg="inputBg"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Например: Zoom-звонок"
                autoFocus
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" color="dimText">URL</FormLabel>
              <Input
                size="sm"
                bg="inputBg"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </FormControl>
            <HStack w="full" justify="flex-end" spacing={2}>
              <Button size="sm" variant="ghost" onClick={handleCancel}>Отмена</Button>
              <Button size="sm" colorScheme="blue" onClick={handleAdd} isLoading={addLink.isPending}>
                Создать
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Collapse>

      {links.length === 0 && (
        <Box textAlign="center" py={10}>
          <Icon as={FiLink} boxSize={8} color="faintText" mb={2} />
          <Text fontSize="sm" color="dimText">
            {isOrganizer ? 'Добавьте ссылки для участников' : 'Ссылок пока нет'}
          </Text>
        </Box>
      )}

      <VStack align="stretch" spacing={2}>
        {links.map(link => (
          <HStack
            key={link.id}
            p={3.5}
            borderRadius="xl"
            border="1px solid"
            borderColor="subtleBorder"
            bg="cardBg"
            _hover={{ borderColor: 'brand.200', bg: 'navActiveBg' }}
            transition="all 0.15s"
          >
            <Box
              w="32px"
              h="32px"
              borderRadius="lg"
              bg="navActiveBg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Icon as={FiLink} color="brand.500" boxSize={3.5} />
            </Box>
            <Box flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="600" color="mainText" noOfLines={1}>
                {link.title}
              </Text>
              <Link
                href={link.url}
                isExternal
                fontSize="xs"
                color="brand.500"
                noOfLines={1}
                _hover={{ color: 'brand.600' }}
              >
                {link.url} <Icon as={FiExternalLink} boxSize={2.5} mb="1px" />
              </Link>
            </Box>
            {isOrganizer && (
              <IconButton
                aria-label="Удалить ссылку"
                icon={<FiTrash2 />}
                size="sm"
                variant="ghost"
                colorScheme="red"
                onClick={() => handleDelete(link.id)}
                isLoading={removeLink.isPending}
                flexShrink={0}
              />
            )}
          </HStack>
        ))}
      </VStack>
    </VStack>
  )
}

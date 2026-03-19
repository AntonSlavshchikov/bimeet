import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  fonts: {
    heading: `'Inter', system-ui, sans-serif`,
    body: `'Inter', system-ui, sans-serif`,
  },
  colors: {
    brand: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
  },
  styles: {
    global: {
      body: {
        bg: '#F5F5F7',
        color: 'gray.800',
      },
    },
  },
  shadows: {
    card: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
    cardHover: '0 2px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.08)',
    brand: '0 4px 16px rgba(139, 92, 246, 0.28)',
  },
  components: {
    Heading: {
      baseStyle: {
        fontWeight: '600',
        letterSpacing: '-0.02em',
      },
      sizes: {
        xl:  { fontSize: '1.5rem',    lineHeight: '1.3' },
        lg:  { fontSize: '1.1875rem', lineHeight: '1.35' },
        md:  { fontSize: '1rem',      lineHeight: '1.4' },
        sm:  { fontSize: '0.9375rem', lineHeight: '1.4' },
        xs:  { fontSize: '0.8125rem', lineHeight: '1.35' },
      },
    },
    Button: {
      baseStyle: {
        borderRadius: 'lg',
        fontWeight: 500,
        fontSize: 'sm',
        transition: 'all 0.2s',
        letterSpacing: '0.005em',
      },
      variants: {
        solid: (props: { colorScheme: string }) => {
          if (props.colorScheme === 'brand') {
            return {
              bg: 'brand.600',
              color: 'white',
              _hover: {
                bg: 'brand.700',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
              },
              _active: {
                transform: 'translateY(0)',
                bg: 'brand.800',
              },
            }
          }
          if (props.colorScheme === 'blue') {
            return {
              bg: '#6366F1',
              color: 'white',
              _hover: {
                bg: '#4F46E5',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
              },
              _active: { transform: 'translateY(0)', bg: '#4338CA' },
            }
          }
          return {}
        },
        ghost: {
          borderRadius: 'lg',
          color: 'gray.600',
          _hover: { bg: 'gray.100', color: 'gray.800' },
        },
        outline: {
          borderRadius: 'lg',
          borderWidth: '1px',
          borderColor: 'gray.200',
          color: 'gray.700',
          _hover: { bg: 'gray.50', borderColor: 'gray.300' },
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderRadius: 'lg',
            bg: 'white',
            borderColor: 'gray.200',
            fontSize: 'sm',
            _focus: {
              borderColor: 'brand.400',
              boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.12)',
            },
            _hover: { borderColor: 'gray.300' },
          },
        },
      },
      defaultProps: { variant: 'outline' },
    },
    Textarea: {
      variants: {
        outline: {
          borderRadius: 'lg',
          bg: 'white',
          borderColor: 'gray.200',
          fontSize: 'sm',
          _focus: {
            borderColor: 'brand.400',
            boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.12)',
          },
          _hover: { borderColor: 'gray.300' },
        },
      },
    },
    NumberInput: {
      variants: {
        outline: {
          field: {
            borderRadius: 'lg',
            bg: 'white',
            fontSize: 'sm',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: 'xl',
          boxShadow: 'card',
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.06)',
          overflow: 'hidden',
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'md',
        px: 2.5,
        py: 0.5,
        fontWeight: 500,
        fontSize: 'xs',
        textTransform: 'none',
        letterSpacing: '0',
      },
    },
    Tabs: {
      variants: {
        line: {
          tab: {
            fontWeight: 450,
            fontSize: 'sm',
            color: 'gray.500',
            letterSpacing: '0.005em',
            _selected: {
              color: 'gray.900',
              fontWeight: 550,
            },
          },
          tablist: {
            borderColor: 'gray.100',
          },
          tabindicator: {
            bg: 'brand.500',
          },
        },
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            borderRadius: 'lg',
            bg: 'white',
            borderColor: 'gray.200',
          },
        },
      },
    },
    Menu: {
      baseStyle: {
        list: {
          borderRadius: 'xl',
          border: '1px solid',
          borderColor: 'gray.100',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          py: 1,
        },
        item: {
          fontSize: 'sm',
          fontWeight: 450,
          color: 'gray.700',
          _hover: { bg: 'gray.50' },
        },
      },
    },
  },
})

export default theme

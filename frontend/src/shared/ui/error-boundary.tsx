import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/shared/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Верхнеуровневый перехватчик ошибок рендера. Без него любое необработанное
 * исключение в дереве компонентов оставляет пользователя с белым экраном.
 * Показывает понятный fallback и кнопку перезагрузки; текст статичный (русский,
 * язык по умолчанию), чтобы экран ошибки сам не зависел от i18n/провайдеров.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Лог в консоль — сюда же подключается внешний мониторинг (Sentry и т.п.).
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-bg text-ink">
        <h1 className="text-xl font-semibold">Что-то пошло не так</h1>
        <p className="text-ink-3 max-w-sm">
          Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
        </p>
        {import.meta.env.DEV && (
          <pre className="max-w-full overflow-auto rounded-lg bg-bg-2 p-3 text-left text-xs text-ink-3">
            {this.state.error.message}
          </pre>
        )}
        <Button onClick={() => window.location.reload()}>Перезагрузить</Button>
      </div>
    )
  }
}

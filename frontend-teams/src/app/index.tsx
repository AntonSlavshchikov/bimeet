import { BrowserRouter } from 'react-router-dom'
import Providers from './providers'
import AppRouter from './router'
import { bootstrapTokenFromHash } from '@/shared/lib/tokenHandoff'

// Pick up a token handed over from the registration host (#token=...) before
// anything reads localStorage.
bootstrapTokenFromHash()

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </Providers>
  )
}

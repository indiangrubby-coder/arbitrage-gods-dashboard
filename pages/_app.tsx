import '@/styles/globals.css'
import { SimpleAuthProvider } from '@/lib/simple-auth'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function App({ Component, pageProps }: any) {
  return (
    <ErrorBoundary>
      <SimpleAuthProvider>
        <Component {...pageProps} />
      </SimpleAuthProvider>
    </ErrorBoundary>
  )
}
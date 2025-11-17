import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSimpleAuth } from '@/lib/simple-auth'

export default function Home() {
  const { user, loading } = useSimpleAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary">
      <div className="bento-tile-xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600 mx-auto mb-6"></div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Arbitrage Gods</h1>
        <p className="text-text-secondary">Loading your dashboard...</p>
      </div>
    </div>
  )
}
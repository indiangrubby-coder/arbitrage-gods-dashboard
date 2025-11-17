import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSimpleAuth } from '@/lib/simple-auth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn } = useSimpleAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(username, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Arbitrage Gods - Login</title>
        <meta name="description" content="Login to Arbitrage Gods Facebook Ads Dashboard" />
      </Head>

        <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
          <h2 className="text-xl font-semibold mb-4">Sign in</h2>

          <label htmlFor="username" className="text-sm">Username</label>
          <input
            id="username"
            className="border p-2 w-full mb-3"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor="password" className="text-sm">Password</label>
          <input
            id="password"
            type="password"
            className="border p-2 w-full mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="text-red-700 mb-2">{error}</div>}

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </>
  )
  }
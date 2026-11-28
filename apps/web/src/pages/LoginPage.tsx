import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { AuthShell } from '../components/layout/AuthShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login({ email, password })
      showToast({ tone: 'success', title: `Bon retour, ${user.firstName} !`, description: 'Vous êtes connecté.' })
      await navigate({ to: '/', replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Connexion impossible pour le moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Connexion"
      subtitle="Retrouvez votre boutique, vos commandes et votre référence de localisation."
      footer={
        <p className="text-center text-ink-muted">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="font-bold text-brand-700 hover:text-brand-900">
            Créer un compte
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          id="login-email"
          label="Adresse e-mail"
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <Input
          id="login-password"
          label="Mot de passe"
          type="password"
          icon={LockKeyhole}
          autoComplete="current-password"
          placeholder="Votre mot de passe"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <Button type="submit" size="lg" fullWidth loading={loading} iconRight={<ArrowRight className="h-4 w-4" />}>
          Se connecter
        </Button>
      </form>
    </AuthShell>
  )
}

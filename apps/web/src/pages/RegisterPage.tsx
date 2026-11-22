import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, ArrowRight, LockKeyhole, Mail, Phone, Store, UserRound } from 'lucide-react'
import { AuthShell } from '../components/layout/AuthShell'
import { LocationForm, type LocationValue } from '../components/location/LocationForm'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/auth'
import { cn } from '../lib/cn'

const initialLocation: LocationValue = {
  site: 'KAMBOINSIN',
  buildingNumber: '',
  roomNumber: '',
  floor: 0,
}

export default function RegisterPage() {
  const { register } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [role, setRole] = useState<'CLIENT' | 'MERCHANT'>('CLIENT')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [location, setLocation] = useState<LocationValue>(initialLocation)
  const [storeName, setStoreName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const errorOf = (field: string) => fieldErrors[field]?.[0]

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFieldErrors({})
    setGeneralError(null)
    setLoading(true)

    try {
      const user = await register({
        role,
        firstName,
        lastName,
        email,
        phone,
        password,
        ...location,
        ...(role === 'MERCHANT' ? { storeName, whatsapp, description } : {}),
      })
      showToast({
        tone: 'success',
        title: `Bienvenue, ${user.firstName} !`,
        description: role === 'MERCHANT' ? 'Votre boutique est prête.' : 'Votre compte est créé.',
      })
      await navigate({ to: '/profil' })
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.issues?.fieldErrors ?? {})
        setGeneralError(cause.message)
      } else {
        setGeneralError('Inscription impossible pour le moment.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Quelques informations suffisantes pour rejoindre la communauté."
      footer={
        <p className="text-center text-ink-muted">
          Déjà inscrit ?{' '}
          <Link to="/connexion" className="font-bold text-brand-700 hover:text-brand-900">
            Se connecter
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {generalError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Je souhaite</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'CLIENT' as const, label: 'Acheter', icon: UserRound, hint: 'Compte client' },
              { value: 'MERCHANT' as const, label: 'Vendre', icon: Store, hint: 'Avec boutique' },
            ].map((option) => {
              const Icon = option.icon
              const active = role === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200',
                    active
                      ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-500/10'
                      : 'border-line bg-white hover:border-brand-200',
                  )}
                >
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', active ? 'bg-brand-800 text-white' : 'bg-canvas text-brand-600')}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-ink">{option.label}</span>
                    <span className="block text-[11px] text-ink-muted">{option.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="space-y-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-600">
            Informations personnelles
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Aminata" error={errorOf('firstName')} required />
            <Input label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Diallo" error={errorOf('lastName')} required />
          </div>
          <Input id="register-email" label="Adresse e-mail" type="email" icon={Mail} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" error={errorOf('email')} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Téléphone" type="tel" icon={Phone} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" error={errorOf('phone')} required />
            <Input label="Mot de passe" type="password" icon={LockKeyhole} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" error={errorOf('password')} hint="Majuscule, minuscule et chiffre requis." required />
          </div>
        </div>

        <div className="border-t border-line pt-6">
          <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-600">
            Où habitez-vous ?
          </p>
          <LocationForm value={location} onChange={setLocation} errors={fieldErrors} />
        </div>

        {role === 'MERCHANT' && (
          <div className="space-y-4 border-t border-line pt-6">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-600">
              Votre boutique
            </p>
            <Input label="Nom de la boutique" icon={Store} value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Studio Kamboinsin" error={errorOf('storeName')} required />
            <Input label="Numéro WhatsApp" type="tel" icon={Phone} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+226 70 12 34 56" error={errorOf('whatsapp')} required />
            <div>
              <label htmlFor="register-description" className="mb-2 block text-sm font-semibold text-ink">
                Description de l'activité
              </label>
              <textarea
                id="register-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ce que vous vendez et ce qui rend votre boutique spéciale…"
                className="w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-soft focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
              />
              {errorOf('description') && <p className="mt-1.5 text-xs font-medium text-rose-600">{errorOf('description')}</p>}
            </div>
          </div>
        )}

        <Button type="submit" size="lg" fullWidth loading={loading} iconRight={<ArrowRight className="h-4 w-4" />}>
          Créer mon compte
        </Button>
      </form>
    </AuthShell>
  )
}

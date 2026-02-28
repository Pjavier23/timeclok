'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const T = {
  en: {
    title: 'TimeClok',
    subtitle: 'Employee Time Tracking',
    employer: 'Employer',
    employee: 'Employee',
    emailLabel: 'Email',
    emailPlaceholder: 'you@company.com',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign In →',
    signingIn: 'Signing in...',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    demoTitle: '🎯 Demo Accounts',
    demoOwner: 'Employer',
    demoEmployee: 'Employee',
    clickToFill: 'Click email to auto-fill',
    employerWelcome: 'Welcome back, boss 👔',
    employeeWelcome: 'Welcome back 👋',
    employerSub: 'Manage your team & payroll',
    employeeSub: 'Clock in and track your earnings',
  },
  es: {
    title: 'TimeClok',
    subtitle: 'Control de Tiempo para Empleados',
    employer: 'Empleador',
    employee: 'Empleado',
    emailLabel: 'Correo Electrónico',
    emailPlaceholder: 'tu@empresa.com',
    passwordLabel: 'Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    signIn: 'Iniciar Sesión →',
    signingIn: 'Entrando...',
    noAccount: '¿No tienes cuenta?',
    signUp: 'Regístrate',
    demoTitle: '🎯 Cuentas de Prueba',
    demoOwner: 'Empleador',
    demoEmployee: 'Empleado',
    clickToFill: 'Toca el correo para rellenar',
    employerWelcome: 'Bienvenido, jefe 👔',
    employeeWelcome: 'Bienvenido de vuelta 👋',
    employerSub: 'Gestiona tu equipo y nómina',
    employeeSub: 'Registra tu entrada y ganancias',
  },
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [lang, setLang] = useState<'en' | 'es'>('en')
  const [role, setRole] = useState<'employer' | 'employee'>('employer')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const t = T[lang]
  const isEmployer = role === 'employer'
  const accent = isEmployer ? '#00d9ff' : '#22c55e'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      if (!data.user) throw new Error('Login failed')

      const { data: userData } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', data.user.id)
        .single()

      if (userData?.user_type === 'employee') {
        router.push('/employee/dashboard')
      } else {
        router.push('/owner/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }

  const fillDemo = (type: 'owner' | 'employee') => {
    setEmail(type === 'owner' ? 'demo.owner@timeclok.com' : 'demo.employee@timeclok.com')
    setPassword('Demo1234!')
  }

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>

        {/* Language toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
            {(['en', 'es'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none', background: lang === l ? '#fff' : 'transparent', color: lang === l ? '#000' : '#666', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                {l === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}
              </button>
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#1a1a1a', border: `1px solid ${accent}22`, borderRadius: '20px', overflow: 'hidden', boxShadow: `0 0 40px ${accent}0a` }}>

          {/* Role toggle header */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {(['employer', 'employee'] as const).map(r => (
              <button key={r} onClick={() => setRole(r)}
                style={{ flex: 1, padding: '1.1rem', border: 'none', background: role === r ? (r === 'employer' ? 'rgba(0,217,255,0.08)' : 'rgba(34,197,94,0.08)') : 'transparent', color: role === r ? (r === 'employer' ? '#00d9ff' : '#22c55e') : '#444', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', borderBottom: role === r ? `2px solid ${r === 'employer' ? '#00d9ff' : '#22c55e'}` : '2px solid transparent' }}>
                {r === 'employer' ? `👔 ${t.employer}` : `👤 ${t.employee}`}
              </button>
            ))}
          </div>

          <div style={{ padding: '2rem' }}>
            {/* Logo + welcome */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>⏱</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: accent, marginBottom: '0.25rem' }}>{t.title}</div>
              <div style={{ fontSize: '0.85rem', color: '#555' }}>
                {isEmployer ? t.employerSub : t.employeeSub}
              </div>
            </div>

            {/* Demo box */}
            <div style={{ background: `${accent}0a`, border: `1px solid ${accent}22`, borderRadius: '10px', padding: '0.875rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{t.demoTitle}</div>
              <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.2rem' }}>
                <strong style={{ color: '#00d9ff' }}>{t.demoOwner}:</strong>{' '}
                <span onClick={() => fillDemo('owner')} style={{ cursor: 'pointer', textDecoration: 'underline', color: '#aaa' }}>demo.owner@timeclok.com</span>
                {' '}/ Demo1234!
              </div>
              <div style={{ fontSize: '0.78rem', color: '#888' }}>
                <strong style={{ color: '#22c55e' }}>{t.demoEmployee}:</strong>{' '}
                <span onClick={() => fillDemo('employee')} style={{ cursor: 'pointer', textDecoration: 'underline', color: '#aaa' }}>demo.employee@timeclok.com</span>
                {' '}/ Demo1234!
              </div>
              <div style={{ fontSize: '0.67rem', color: '#444', marginTop: '0.35rem' }}>{t.clickToFill}</div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{t.emailLabel}</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.875rem 1rem', color: '#fff', fontSize: '0.9375rem', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = `${accent}66` }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.passwordLabel}</label>
                  <a href={`/auth/forgot-password?email=${encodeURIComponent(email)}`} style={{ fontSize: '0.78rem', color: accent, textDecoration: 'none', fontWeight: '600' }}>{t.forgotPassword}</a>
                </div>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.875rem 1rem', color: '#fff', fontSize: '0.9375rem', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = `${accent}66` }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '0.875rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '0.9rem', background: loading ? `${accent}55` : accent, color: isEmployer ? '#000' : '#000', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}>
                {loading ? t.signingIn : t.signIn}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: '#444' }}>
              {t.noAccount}{' '}
              <a href="/auth/signup" style={{ color: accent, textDecoration: 'none', fontWeight: '700' }}>{t.signUp}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}

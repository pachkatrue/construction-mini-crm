import { useState, type FormEvent } from 'react'
import { HardHat, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { supabase } from './lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) setError(authError.message)
    setBusy(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark"><HardHat size={22} /></div>
          <div><strong>BuildFlow</strong><span>PROJECT CONTROL</span></div>
        </div>
        <div className="auth-heading">
          <span className="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</span>
          <h1>С возвращением</h1>
          <p>Войдите в аккаунт, чтобы продолжить работу с объектами и задачами.</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Электронная почта</span>
            <div className="auth-input"><Mail size={17} /><input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="name@company.ru" /></div>
          </label>
          <label>
            <span>Пароль</span>
            <div className="auth-input"><LockKeyhole size={17} /><input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Ваш пароль" /></div>
          </label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : null}
            {busy ? 'Подождите…' : 'Войти в систему'}
          </button>
        </form>
        <p className="auth-footnote">Доступ предоставляется администратором компании.</p>
      </section>
    </main>
  )
}

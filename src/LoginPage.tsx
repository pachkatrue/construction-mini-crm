import { useState, type FormEvent } from 'react'
import { HardHat, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { supabase } from './lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    setSuccess(null)

    if (mode === 'signup') {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      })
      if (authError) setError(authError.message)
      else if (data.session) setSuccess('Аккаунт создан. Выполняется вход…')
      else setSuccess('Аккаунт создан. Проверьте почту и подтвердите адрес, затем войдите в систему.')
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) setError(authError.message)
    }
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
          <h1>{mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}</h1>
          <p>{mode === 'login' ? 'Войдите в аккаунт, чтобы продолжить работу с объектами и задачами.' : 'Зарегистрируйтесь, чтобы получить доступ к рабочему пространству компании.'}</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && <label><span>Ваше имя</span><div className="auth-input"><UserRound size={17} /><input autoComplete="name" required maxLength={120} value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Имя Фамилия" /></div></label>}
          <label>
            <span>Электронная почта</span>
            <div className="auth-input"><Mail size={17} /><input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="name@company.ru" /></div>
          </label>
          <label>
            <span>Пароль</span>
            <div className="auth-input"><LockKeyhole size={17} /><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} placeholder="Не менее 6 символов" /></div>
          </label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          {success && <div className="auth-success" role="status">{success}</div>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : null}
            {busy ? 'Подождите…' : mode === 'login' ? 'Войти в систему' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className="auth-footnote">{mode === 'login' ? 'Нет аккаунта?' : 'Уже зарегистрированы?'} <button className="auth-mode-button" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null) }}>{mode === 'login' ? 'Создать аккаунт' : 'Войти'}</button></p>
        {mode === 'signup' && <p className="auth-footnote">Новые аккаунты получают роль «Исполнитель». Роль постановщика назначает администратор.</p>}
      </section>
    </main>
  )
}

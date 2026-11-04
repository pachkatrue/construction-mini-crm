import { useMemo, useState, type FormEvent } from 'react'
import { Activity, ArrowUpRight, Bell, Building2, CheckCircle2, ChevronDown, CircleHelp, ClipboardList, Clock3, FileText, LayoutDashboard, Plus, Search, Settings, ShieldCheck, Users, HardHat, X, LoaderCircle } from 'lucide-react'
import type { Role, TaskStatus } from './types'
import LoginPage from './LoginPage'
import { useAuth } from './lib/useAuth'
import { useCrmData } from './lib/useCrmData'

const statusLabels: Record<TaskStatus, string> = { new: 'Новая', in_progress: 'В работе', review: 'На проверке', revision: 'На доработке', accepted: 'Принята' }
const statusClasses: Record<TaskStatus, string> = { new: 'status-new', in_progress: 'status-progress', review: 'status-review', revision: 'status-revision', accepted: 'status-accepted' }

function App() {
  const auth = useAuth()
  const [demoRole, setDemoRole] = useState<Role>('manager')
  const role: Role = auth.profile?.role ?? demoRole
  const crm = useCrmData(auth.profile)
  const [activeNav, setActiveNav] = useState('Обзор')
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [modal, setModal] = useState<'project' | 'task' | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const visibleTasks = useMemo(() => crm.tasks.filter(task => {
    const haystack = (task.title + task.id + (task.project?.name ?? '') + (task.assignee?.full_name ?? '')).toLowerCase()
    return haystack.includes(search.toLowerCase()) && (!selectedProject || task.project_id === selectedProject)
  }), [crm.tasks, search, selectedProject])
  const counts = {
    total: visibleTasks.length,
    active: visibleTasks.filter(task => task.status === 'in_progress' || task.status === 'revision').length,
    review: visibleTasks.filter(task => task.status === 'review').length,
    accepted: visibleTasks.filter(task => task.status === 'accepted').length,
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true); setFormError(null)
    try {
      await crm.createProject({ name: String(form.get('name')).trim(), address: String(form.get('address')).trim(), description: String(form.get('description')).trim() })
      setModal(null)
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Не удалось создать объект') }
    finally { setSaving(false) }
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true); setFormError(null)
    try {
      await crm.createTask({
        project_id: String(form.get('project_id')), title: String(form.get('title')).trim(),
        description: String(form.get('description')).trim(), assignee_id: String(form.get('assignee_id')),
        due_date: String(form.get('due_date') ?? ''), priority: String(form.get('priority')),
      })
      setModal(null)
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Не удалось создать задачу') }
    finally { setSaving(false) }
  }

  async function moveTask(id: string, status: TaskStatus) {
    let comment: string | undefined
    if (status === 'revision') {
      comment = window.prompt('Укажите замечания для доработки:')?.trim()
      if (!comment) return
    }
    try { await crm.changeStatus(id, status, comment) }
    catch (error) { window.alert(error instanceof Error ? error.message : 'Не удалось изменить статус') }
  }

  if (auth.configured && auth.loading) return <main className="auth-page"><div className="auth-card">Загрузка профиля…</div></main>
  if (auth.configured && !auth.user) return <LoginPage />
  if (auth.configured && auth.user && !auth.profile) return <main className="auth-page"><div className="auth-card"><h2>Профиль не найден</h2><p>{auth.error || 'Попросите администратора проверить запись в таблице profiles.'}</p><button className="primary-button" onClick={() => void auth.signOut()}>Выйти</button></div></main>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><HardHat size={21} /></div><div><strong>BuildFlow</strong><span>PROJECT CONTROL</span></div></div>
        <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav>
          {[{ label: 'Обзор', icon: LayoutDashboard }, { label: 'Объекты', icon: Building2 }, { label: 'Мои задачи', icon: ClipboardList }, { label: 'Команда', icon: Users }].map(item => {
            const Icon = item.icon
            return <button key={item.label} className={activeNav === item.label ? 'nav-item active' : 'nav-item'} onClick={() => { setActiveNav(item.label); setSelectedProject(null) }}><Icon size={18} />{item.label}</button>
          })}
        </nav>
        <div className="sidebar-bottom"><button className="nav-item"><Settings size={18} />Настройки</button><button className="nav-item"><CircleHelp size={18} />Помощь</button><div className="profile-mini"><div className="avatar">{(auth.profile?.full_name || 'Пользователь').split(' ').map(part => part[0]).join('').slice(0, 2)}</div><div><b>{auth.profile?.full_name || 'Пользователь'}</b><span>{role === 'manager' ? 'Постановщик' : 'Исполнитель'}</span></div>{auth.configured ? <button className="signout-button" onClick={() => void auth.signOut()}>Выйти</button> : <ChevronDown size={16} />}</div></div>
      </aside>

      <main className="main">
        <header className="topbar"><div className="breadcrumb">Рабочее пространство <span>/</span> <b>{activeNav}</b></div><div className="top-actions">{!auth.configured && <label className="role-switch"><span>Демо-режим</span><select value={demoRole} onChange={e => setDemoRole(e.target.value as Role)}><option value="manager">Постановщик</option><option value="executor">Исполнитель</option></select></label>}<button className="icon-button"><Bell size={18} /><i /></button><div className="avatar top-avatar">{(auth.profile?.full_name || 'П').split(' ').map(part => part[0]).join('').slice(0, 2)}</div></div></header>
        <div className="content">
          <div className="page-heading"><div><div className="eyebrow">СРЕДА УПРАВЛЕНИЯ ПРОЕКТАМИ</div><h1>{activeNav === 'Обзор' ? 'Добрый день, ' + (auth.profile?.full_name || 'коллега') : activeNav}</h1><p>{role === 'manager' ? 'Контролируйте ход работ и держите задачи под контролем.' : 'Здесь собраны ваши задачи и ближайшие сроки.'}</p></div>{role === 'manager' && <button className="primary-button" onClick={() => { setModal('task'); setFormError(null) }}><Plus size={17} /> Новая задача</button>}</div>

          {crm.error && <div className="auth-error" role="alert">Ошибка загрузки данных: {crm.error} <button className="text-button" onClick={() => void crm.reload()}>Повторить</button></div>}
          {crm.loading ? <div className="panel empty-state"><LoaderCircle className="spin" size={22} /> Загрузка объектов и задач…</div> : <>
            <section className="stats-grid">
              <StatCard icon={<ClipboardList size={19} />} label="Всего задач" value={String(counts.total)} detail="В доступных проектах" tone="blue" />
              <StatCard icon={<Activity size={19} />} label="В работе" value={String(counts.active)} detail="Требуют выполнения" tone="orange" />
              <StatCard icon={<Clock3 size={19} />} label="На проверке" value={String(counts.review)} detail="Ожидают решения" tone="purple" />
              <StatCard icon={<CheckCircle2 size={19} />} label="Принято" value={String(counts.accepted)} detail="Работы завершены" tone="green" />
            </section>

            {(activeNav === 'Обзор' || activeNav === 'Объекты') && <section className="panel projects-panel">
              <div className="section-heading"><div><h2>Строительные объекты</h2><p>Реальные данные из Supabase</p></div><div className="table-tools">{role === 'manager' && <button className="primary-button" onClick={() => { setModal('project'); setFormError(null) }}><Plus size={15} /> Новый объект</button>}</div></div>
              {crm.projects.length === 0 ? <div className="empty-state">Объектов пока нет{role === 'manager' ? ' — создайте первый объект.' : '.'}</div> : <div className="project-grid">{crm.projects.map((project, index) => <button className={selectedProject === project.id ? 'project-card selected' : 'project-card'} key={project.id} onClick={() => { setSelectedProject(selectedProject === project.id ? null : project.id); setActiveNav('Обзор') }}><div className="project-top"><div className={'project-icon project-icon-' + (index % 3)}><Building2 size={19} /></div><span className="project-menu">•••</span></div><h3>{project.name}</h3><p className="project-address">{project.address || 'Адрес не указан'}</p><div className="progress-meta"><span>Принято задач</span><b>{project.progress}%</b></div><div className="progress-track"><div style={{ width: project.progress + '%' }} /></div><div className="project-footer"><span><ClipboardList size={14} />{project.tasksCount} задач</span><span>Открыть <ArrowUpRight size={13} /></span></div></button>)}</div>}
            </section>}

            {(activeNav === 'Обзор' || activeNav === 'Мои задачи' || activeNav === 'Объекты') && <section className="panel tasks-panel">
              <div className="section-heading"><div><h2>{selectedProject ? 'Задачи объекта' : role === 'manager' ? 'Последние задачи' : 'Мои задачи'}</h2><p>Актуальный статус и сроки выполнения</p></div><div className="table-tools"><label className="search-box"><Search size={16} /><input placeholder="Поиск задач..." value={search} onChange={e => setSearch(e.target.value)} /></label></div></div>
              <div className="task-list"><div className="task-row task-head"><span>ЗАДАЧА</span><span>ОТВЕТСТВЕННЫЙ</span><span>СРОК</span><span>СТАТУС</span><span /></div>{visibleTasks.map(task => <div className="task-row" key={task.id}><div className="task-name"><b>{task.title}</b><span>{task.project?.name ?? 'Объект удалён'} · {task.description}</span></div><div className="assignee"><div className="avatar small-avatar">{(task.assignee?.full_name || '?').split(' ').map(x => x[0]).join('')}</div>{task.assignee?.full_name || 'Неизвестно'}</div><div className="due-date">{task.due_date ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('ru-RU') : '—'}</div><div><span className={'status-pill ' + statusClasses[task.status]}>{statusLabels[task.status]}</span></div><div className="task-actions">{role === 'executor' && task.assignee_id === auth.profile?.id && (task.status === 'new' || task.status === 'revision' || task.status === 'in_progress') ? <button className="complete-button" onClick={() => void moveTask(task.id, task.status === 'new' || task.status === 'revision' ? 'in_progress' : 'review')}>{task.status === 'in_progress' ? 'На проверку' : 'В работу'}</button> : role === 'manager' && task.status === 'review' ? <div className="task-manager-actions"><button className="complete-button" onClick={() => void moveTask(task.id, 'accepted')}>Принять</button><button className="complete-button" onClick={() => void moveTask(task.id, 'revision')}>Доработка</button></div> : <span />}</div></div>)}{visibleTasks.length === 0 && <div className="empty-state">Задачи не найдены</div>}</div>
              <div className="list-footer">Показано {visibleTasks.length} задач <span>Данные Supabase · обновляются после изменений</span></div>
            </section>}
            {activeNav === 'Команда' && <section className="panel"><div className="section-heading"><div><h2>Команда</h2><p>Пользователи рабочей области</p></div></div>{role !== 'manager' ? <div className="empty-state">Раздел доступен постановщику.</div> : crm.team.map(member => <div className="task-row" key={member.id}><div className="assignee"><div className="avatar small-avatar">{member.full_name.split(' ').map(x => x[0]).join('')}</div>{member.full_name || member.id}</div><div>{member.role === 'manager' ? 'Постановщик' : 'Исполнитель'}</div></div>)}</section>}
          </>}
          <div className="demo-note"><ShieldCheck size={16} /> {auth.configured ? 'Авторизация, объекты, задачи и переходы статусов подключены к Supabase. Доступ ограничивается политиками RLS.' : 'Демонстрационный режим: для работы с общей базой настройте переменные Supabase и войдите в систему.'}</div>
        </div>
      </main>

      {modal && <div className="modal-backdrop" onClick={() => !saving && setModal(null)}><div className="modal crm-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)} disabled={saving}><X size={19} /></button><div className="modal-icon"><FileText size={22} /></div><h2>{modal === 'project' ? 'Новый объект' : 'Создание задачи'}</h2><p>{modal === 'project' ? 'Добавьте строительный объект в рабочую область.' : 'Назначьте задачу участнику команды.'}</p>
        <form className="crm-form" onSubmit={modal === 'project' ? submitProject : submitTask}>
          {modal === 'project' ? <><label>Название объекта<input name="name" required maxLength={160} placeholder="ЖК «Северный парк»" /></label><label>Адрес<input name="address" maxLength={240} placeholder="Город, улица, дом" /></label><label>Описание<textarea name="description" rows={3} maxLength={2000} placeholder="Краткое описание объекта" /></label></> : <><label>Объект<select name="project_id" required>{crm.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Название задачи<input name="title" required maxLength={200} placeholder="Например, проверить армирование" /></label><label>Описание<textarea name="description" rows={3} maxLength={3000} /></label><label>Исполнитель<select name="assignee_id" required>{crm.team.filter(member => member.role === 'executor').map(member => <option key={member.id} value={member.id}>{member.full_name || member.id}</option>)}</select></label><label>Срок<input name="due_date" type="date" /></label><label>Приоритет<select name="priority"><option value="medium">Средний</option><option value="high">Высокий</option><option value="low">Низкий</option></select></label></>}
          {formError && <div className="auth-error">{formError}</div>}<button className="primary-button auth-submit" type="submit" disabled={saving || (modal === 'task' && (!crm.projects.length || !crm.team.some(member => member.role === 'executor')))}>{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={16} />}{saving ? 'Сохраняем…' : 'Сохранить'}</button>
          {modal === 'task' && (!crm.projects.length || !crm.team.some(member => member.role === 'executor')) && <div className="auth-error">Для создания задачи нужен хотя бы один объект и зарегистрированный исполнитель.</div>}
        </form>
      </div></div>}
    </div>
  )
}

function StatCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) {
  return <div className="stat-card"><div className={'stat-icon ' + tone}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>
}

export default App

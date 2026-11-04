import { useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Bell, Building2, CalendarDays, CheckCircle2, ChevronDown, CircleHelp, ClipboardList, Clock3, FileText, LayoutDashboard, Plus, Search, Settings, ShieldCheck, Users, HardHat } from 'lucide-react'
import { projects as initialProjects, tasks as initialTasks } from './data'
import type { Role, TaskStatus } from './types'
import LoginPage from './LoginPage'
import { useAuth } from './lib/useAuth'

const statusLabels: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  revision: 'На доработке',
  accepted: 'Принята',
}

const statusClasses: Record<TaskStatus, string> = {
  new: 'status-new',
  in_progress: 'status-progress',
  review: 'status-review',
  revision: 'status-revision',
  accepted: 'status-accepted',
}

function App() {
  const auth = useAuth()
  const [demoRole, setDemoRole] = useState<Role>('manager')
  const role: Role = auth.profile?.role ?? demoRole
  const [activeNav, setActiveNav] = useState('Обзор')
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [tasks, setTasks] = useState(initialTasks)
  const [showCreate, setShowCreate] = useState(false)

  const visibleTasks = useMemo(() => {
    const base = role === 'executor' ? tasks.filter(task => task.assignee === 'Алексей Смирнов') : tasks
    return base.filter(task => {
      const project = initialProjects.find(item => item.id === task.projectId)
      const matchesSearch = (task.title + task.id + (project?.name ?? '')).toLowerCase().includes(search.toLowerCase())
      return matchesSearch && (!selectedProject || task.projectId === selectedProject)
    })
  }, [role, search, selectedProject, tasks])

  const counts = {
    total: visibleTasks.length,
    active: visibleTasks.filter(task => task.status === 'in_progress' || task.status === 'revision').length,
    review: visibleTasks.filter(task => task.status === 'review').length,
    accepted: visibleTasks.filter(task => task.status === 'accepted').length,
  }

  function moveTask(id: string, status: TaskStatus) {
    setTasks(current => current.map(task => task.id === id ? { ...task, status } : task))
  }

  if (auth.configured && auth.loading) return <main className="auth-page"><div className="auth-card">Загрузка профиля…</div></main>
  if (auth.configured && !auth.user) return <LoginPage />
  if (auth.configured && auth.user && !auth.profile) return <main className="auth-page"><div className="auth-card"><h2>Профиль не найден</h2><p>Попросите администратора проверить запись в таблице profiles.</p><button className="primary-button" onClick={() => void auth.signOut()}>Выйти</button></div></main>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><HardHat size={21} /></div><div><strong>BuildFlow</strong><span>PROJECT CONTROL</span></div></div>
        <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav>
          {[{ label: 'Обзор', icon: LayoutDashboard }, { label: 'Объекты', icon: Building2 }, { label: 'Мои задачи', icon: ClipboardList }, { label: 'Команда', icon: Users }].map(item => {
            const Icon = item.icon
            return <button key={item.label} className={activeNav === item.label ? 'nav-item active' : 'nav-item'} onClick={() => { setActiveNav(item.label); setSelectedProject(null) }}><Icon size={18} />{item.label}{item.label === 'Мои задачи' && <span className="nav-count">5</span>}</button>
          })}
        </nav>
        <div className="sidebar-bottom"><button className="nav-item"><Settings size={18} />Настройки</button><button className="nav-item"><CircleHelp size={18} />Помощь</button><div className="profile-mini"><div className="avatar">{(auth.profile?.full_name || (role === 'manager' ? 'Анна Петрова' : 'Алексей Смирнов')).split(' ').map(part => part[0]).join('').slice(0, 2)}</div><div><b>{auth.profile?.full_name || (role === 'manager' ? 'Анна Петрова' : 'Алексей Смирнов')}</b><span>{role === 'manager' ? 'Постановщик' : 'Исполнитель'}</span></div>{auth.configured ? <button className="signout-button" onClick={() => void auth.signOut()}>Выйти</button> : <ChevronDown size={16} />}</div></div>
      </aside>

      <main className="main">
        <header className="topbar"><div className="breadcrumb">Рабочее пространство <span>/</span> <b>{activeNav}</b></div><div className="top-actions">{!auth.configured && <label className="role-switch"><span>Демо-режим</span><select value={demoRole} onChange={e => setDemoRole(e.target.value as Role)}><option value="manager">Постановщик</option><option value="executor">Исполнитель</option></select></label>}<button className="icon-button"><Bell size={18} /><i /></button><div className="avatar top-avatar">{role === 'manager' ? 'АП' : 'АС'}</div></div></header>

        <div className="content">
          <div className="page-heading"><div><div className="eyebrow">СРЕДА УПРАВЛЕНИЯ ПРОЕКТАМИ</div><h1>{activeNav === 'Обзор' ? 'Добрый день, Анна' : activeNav}</h1><p>{role === 'manager' ? 'Контролируйте ход работ и держите задачи под контролем.' : 'Здесь собраны ваши задачи и ближайшие сроки.'}</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> Новая задача</button></div>

          <section className="stats-grid">
            <StatCard icon={<ClipboardList size={19} />} label="Всего задач" value={String(counts.total)} detail="В доступных проектах" tone="blue" />
            <StatCard icon={<Activity size={19} />} label="В работе" value={String(counts.active)} detail="Требуют выполнения" tone="orange" />
            <StatCard icon={<Clock3 size={19} />} label="На проверке" value={String(counts.review)} detail="Ожидают решения" tone="purple" />
            <StatCard icon={<CheckCircle2 size={19} />} label="Принято" value={String(counts.accepted)} detail="Работы завершены" tone="green" />
          </section>

          <section className="panel projects-panel">
            <div className="section-heading"><div><h2>Строительные объекты</h2><p>Сводка по текущим проектам</p></div><button className="text-button" onClick={() => setActiveNav('Объекты')}>Все объекты <ArrowUpRight size={15} /></button></div>
            <div className="project-grid">{initialProjects.map((project, index) => <button className={selectedProject === project.id ? 'project-card selected' : 'project-card'} key={project.id} onClick={() => { setSelectedProject(selectedProject === project.id ? null : project.id); setActiveNav('Обзор') }}><div className="project-top"><div className={'project-icon project-icon-' + index}><Building2 size={19} /></div><span className="project-menu">•••</span></div><h3>{project.name}</h3><p className="project-address">{project.address}</p><div className="progress-meta"><span>Готовность</span><b>{project.progress}%</b></div><div className="progress-track"><div style={{ width: project.progress + '%' }} /></div><div className="project-footer"><span><ClipboardList size={14} />{project.tasksCount} задач</span><span>Открыть <ArrowUpRight size={13} /></span></div></button>)}</div>
          </section>

          <section className="panel tasks-panel">
            <div className="section-heading"><div><h2>{selectedProject ? 'Задачи объекта' : role === 'manager' ? 'Последние задачи' : 'Мои задачи'}</h2><p>Актуальный статус и сроки выполнения</p></div><div className="table-tools"><label className="search-box"><Search size={16} /><input placeholder="Поиск задач..." value={search} onChange={e => setSearch(e.target.value)} /></label><button className="filter-button"><CalendarDays size={16} /> Сроки</button></div></div>
            <div className="task-list"><div className="task-row task-head"><span>ЗАДАЧА</span><span>ОТВЕТСТВЕННЫЙ</span><span>СРОК</span><span>СТАТУС</span><span /></div>{visibleTasks.map(task => <div className="task-row" key={task.id}><div className="task-name"><b>{task.title}</b><span>{task.id} · {initialProjects.find(p => p.id === task.projectId)?.name}</span></div><div className="assignee"><div className="avatar small-avatar">{task.assignee.split(' ').map(x => x[0]).join('')}</div>{task.assignee}</div><div className="due-date">{task.dueDate}</div><div><span className={'status-pill ' + statusClasses[task.status]}>{statusLabels[task.status]}</span></div><div className="task-actions">{role === 'executor' && (task.status === 'new' || task.status === 'revision' || task.status === 'in_progress') ? <button className="complete-button" onClick={() => moveTask(task.id, task.status === 'new' || task.status === 'revision' ? 'in_progress' : 'review')}>{task.status === 'in_progress' ? 'На проверку' : 'В работу'}</button> : <button className="dots-button">•••</button>}</div></div>)}{visibleTasks.length === 0 && <div className="empty-state">Задачи не найдены</div>}</div>
            <div className="list-footer">Показано {visibleTasks.length} из {visibleTasks.length} задач <span>Демонстрационные данные</span></div>
          </section>
          <div className="demo-note"><ShieldCheck size={16} /> Сейчас включён демонстрационный режим. Реальные роли и ограничения доступа будут обеспечиваться Supabase RLS на следующем этапе.</div>
        </div>
      </main>
      {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowCreate(false)}>×</button><div className="modal-icon"><FileText size={22} /></div><h2>Создание задачи</h2><p>Форма постановки задачи будет подключена на следующем этапе разработки.</p><button className="primary-button" onClick={() => setShowCreate(false)}>Понятно</button></div></div>}
    </div>
  )
}

function StatCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) {
  return <div className="stat-card"><div className={'stat-icon ' + tone}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>
}

export default App

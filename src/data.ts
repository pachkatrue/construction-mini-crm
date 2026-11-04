import type { Project, Task } from './types'

export const projects: Project[] = [
  { id: 'p-1', name: 'ЖК «Северный парк»', address: 'Москва, ул. Лесная, 18', description: 'Жилой комплекс, корпус 2', progress: 68, tasksCount: 12 },
  { id: 'p-2', name: 'Бизнес-центр «Горизонт»', address: 'Москва, пр-т Мира, 104', description: 'Офисное здание, этап отделки', progress: 42, tasksCount: 8 },
  { id: 'p-3', name: 'Складской комплекс «Вектор»', address: 'Химки, Вашутинское шоссе, 7', description: 'Склад и административный блок', progress: 91, tasksCount: 5 },
]

export const tasks: Task[] = [
  { id: 'T-104', projectId: 'p-1', title: 'Проверить армирование перекрытия', description: 'Проверить соответствие рабочей документации перед заливкой бетона.', assignee: 'Алексей Смирнов', status: 'in_progress', dueDate: '2026-11-08', priority: 'high' },
  { id: 'T-103', projectId: 'p-1', title: 'Согласовать спецификацию дверей', description: 'Подготовить и передать спецификацию на согласование.', assignee: 'Мария Волкова', status: 'review', dueDate: '2026-11-06', priority: 'medium' },
  { id: 'T-102', projectId: 'p-2', title: 'Подготовить стены к покраске', description: 'Проверить геометрию и качество шпаклёвки на третьем этаже.', assignee: 'Алексей Смирнов', status: 'new', dueDate: '2026-11-12', priority: 'medium' },
  { id: 'T-101', projectId: 'p-2', title: 'Исправить замечания по электрике', description: 'Устранить замечания технического надзора.', assignee: 'Иван Петров', status: 'revision', dueDate: '2026-11-05', priority: 'high' },
  { id: 'T-099', projectId: 'p-3', title: 'Сдать исполнительную документацию', description: 'Собрать и проверить комплект документов.', assignee: 'Мария Волкова', status: 'accepted', dueDate: '2026-11-02', priority: 'low' },
]

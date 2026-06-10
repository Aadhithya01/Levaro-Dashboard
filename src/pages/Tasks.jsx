import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddTaskModal from '../components/AddTaskModal'

function TaskRow({ task, memberMap, today, onToggle }) {
  const overdue = task.due_date && task.due_date < today && task.status === 'pending'
  const assignee = task.assigned_to ? memberMap[task.assigned_to] : null
  return (
    <div className="bg-white rounded-lg border border-brand-border px-4 py-3 flex items-center gap-3">
      <button
        type="button"
        onClick={() => onToggle(task)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          task.status === 'done'
            ? 'border-brand-green bg-brand-green'
            : 'border-gray-300 hover:border-brand-green'
        }`}
      >
        {task.status === 'done' && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {task.due_date && (
            <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {overdue ? 'Overdue · ' : ''}{task.due_date}
            </span>
          )}
          {assignee && (
            <span className="text-xs text-gray-400">{task.due_date ? '·' : ''} {assignee.name}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function fetchAll() {
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('ledger_members').select('*').order('name'),
    ])
    setTasks(t ?? [])
    setMembers(m ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function toggleTask(task) {
    const newStatus = task.status === 'pending' ? 'done' : 'pending'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const today = new Date().toISOString().slice(0, 10)
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  const pending = tasks
    .filter(t => t.status === 'pending')
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })
  const done = tasks.filter(t => t.status === 'done')

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <h1 className="text-xl font-bold text-brand-green">Tasks</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
          >
            + Add Task
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : pending.length === 0 && done.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-gray-600 text-sm font-medium mb-1">No tasks yet</p>
            <p className="text-gray-400 text-xs mb-5">Add tasks to track what needs to be done</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
            >
              + Add Task
            </button>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2 mb-6">
                <h2 className="text-xs font-semibold text-brand-green uppercase tracking-widest mb-3">Pending</h2>
                {pending.map(t => (
                  <TaskRow key={t.id} task={t} memberMap={memberMap} today={today} onToggle={toggleTask} />
                ))}
              </div>
            )}
            {done.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Done</h2>
                {done.map(t => (
                  <TaskRow key={t.id} task={t} memberMap={memberMap} today={today} onToggle={toggleTask} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <AddTaskModal members={members} onClose={() => setShowModal(false)} onAdded={fetchAll} />
      )}
    </div>
  )
}

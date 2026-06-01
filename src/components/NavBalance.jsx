import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { netBetween } from '../lib/ledgerUtils'

export default function NavBalance() {
  const { user } = useAuth()
  const [net, setNet] = useState(null)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [{ data: members }, { data: expenses }, { data: settlements }] = await Promise.all([
        supabase.from('ledger_members').select('*'),
        supabase.from('ledger_expenses').select('*, ledger_splits(*)'),
        supabase.from('ledger_settlements').select('*'),
      ])
      if (!members || !expenses || !settlements) return
      const me = members.find(m => m.email === user.email)
      if (!me) return
      const others = members.filter(m => m.id !== me.id)
      const total = others.reduce((sum, o) => sum + netBetween(me.id, o.id, expenses, settlements), 0)
      setNet(total)
    }
    load()
  }, [user])

  if (net === null || Math.abs(net) < 0.01) return null
  const isOwing = net > 0
  return (
    <div className="flex flex-col items-end leading-none">
      <span className={`text-[9px] font-semibold uppercase tracking-widest ${isOwing ? 'text-red-300/70' : 'text-emerald-300/70'}`}>
        {isOwing ? 'you owe' : 'owed to you'}
      </span>
      <span className={`text-sm font-bold tabular-nums mt-0.5 ${isOwing ? 'text-red-300' : 'text-emerald-300'}`}>
        ₹{Math.abs(net).toFixed(0)}
      </span>
    </div>
  )
}

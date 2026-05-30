export function netBetween(mAId, mBId, expenses, settlements) {
  let aOwesB = 0
  let bOwesA = 0
  for (const exp of expenses) {
    if (exp.paid_by === mBId) {
      const split = (exp.ledger_splits ?? []).find(s => s.member_id === mAId)
      if (split) aOwesB += parseFloat(split.amount)
    }
    if (exp.paid_by === mAId) {
      const split = (exp.ledger_splits ?? []).find(s => s.member_id === mBId)
      if (split) bOwesA += parseFloat(split.amount)
    }
  }
  const aSettledB = settlements
    .filter(s => s.from_member === mAId && s.to_member === mBId)
    .reduce((sum, s) => sum + parseFloat(s.amount), 0)
  const bSettledA = settlements
    .filter(s => s.from_member === mBId && s.to_member === mAId)
    .reduce((sum, s) => sum + parseFloat(s.amount), 0)
  return aOwesB - bOwesA - aSettledB + bSettledA
}

export const calculateDaysUntilExpiration = (createdAt: string): number => {
  const creationDate = new Date(createdAt)
  const expirationDate = new Date(creationDate)
  expirationDate.setDate(expirationDate.getDate() + 365)

  const now = new Date()
  const diffTime = expirationDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(diffDays, 1)
}

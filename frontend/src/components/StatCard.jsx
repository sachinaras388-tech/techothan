import { motion } from 'framer-motion'

export default function StatCard({ title, value, icon, trend, color = 'green', delay = 0 }) {
  const colors = {
    green: 'from-accent-green to-accent-green-dark',
    red: 'from-danger to-danger-dark',
    yellow: 'from-warning to-warning-dark',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
  }

  const iconColors = {
    green: 'text-accent-green',
    red: 'text-danger',
    yellow: 'text-warning',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card p-6 card-hover"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend > 0 ? 'text-accent-green' : 'text-danger'}`}>
              {trend > 0 ? '+' : ''}
              {trend}% from last month
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <span className={iconColors[color]}>{icon}</span>
        </div>
      </div>
    </motion.div>
  )
}

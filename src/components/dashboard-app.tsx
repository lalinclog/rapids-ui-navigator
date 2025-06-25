
import React from 'react'

interface DashboardAppProps {
  children?: React.ReactNode
}

export const DashboardApp: React.FC<DashboardAppProps> = ({ children }) => {
  return (
    <div className="dashboard-app">
      {children}
    </div>
  )
}

export default DashboardApp

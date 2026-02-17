import LayoutWithNav from './layout-with-nav'
import { Dashboard } from '@/components/dashboard/Dashboard'

export default function Home() {
  return (
    <LayoutWithNav>
      <Dashboard />
    </LayoutWithNav>
  )
}

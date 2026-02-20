import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Navbar } from '@/components/layout/Navbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { PendingInvitationsPopup } from '@/components/invitations/PendingInvitationsPopup'
import { redirect } from 'next/navigation'

export default async function LayoutWithNav({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        userName={session.user?.name || session.user?.email || ''}
        userImage={session.user?.image || undefined}
      />
      <PendingInvitationsPopup />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-20 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

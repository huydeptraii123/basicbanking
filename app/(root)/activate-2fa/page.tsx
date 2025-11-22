import React from 'react'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import TwoFactorSetup from '@/components/TwoFactorSetup'
import { redirect } from 'next/navigation'

const Activate2FA = async () => {
  const loggedIn = await getLoggedInUser()

  if (!loggedIn) {
    redirect('/sign-in')
  }

  return (
    <section className='flex'>
      <div className="my-banks">
        <TwoFactorSetup user={loggedIn} />
      </div>
    </section>
  )
}

export default Activate2FA

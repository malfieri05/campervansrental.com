import { redirect } from 'next/navigation'

// Vehicle health is now integrated into the host dashboard at /host.
export default function HostHealthPage() {
  redirect('/host')
}

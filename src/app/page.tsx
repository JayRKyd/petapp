import { redirect } from 'next/navigation';

/** The public site is the booking page for now. The owner's screens come later behind sign-in. */
export default function Home() {
  redirect('/book');
}

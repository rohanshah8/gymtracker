import BottomNav from '@/components/BottomNav';

// Shared shell for every authenticated route: the persistent bottom
// navigation (Dashboard | History | + | Exercises | Profile). Individual
// pages just render their content — no page needs to know the nav exists.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}

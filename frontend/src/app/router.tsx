import { createBrowserRouter } from 'react-router-dom';
import LandingPage from '@/features/landing/LandingPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '*',
    element: (
      <main className="min-h-screen bg-black px-6 py-20 text-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">404</p>
          <h1 className="text-4xl font-semibold">Page not found</h1>
        </div>
      </main>
    ),
  },
]);

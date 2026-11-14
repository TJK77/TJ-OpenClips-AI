import { useEffect } from 'react';
import { useStore } from './lib/store';
import Shell from './components/Shell';
import { ToastHost } from './components/ui';
import Welcome from './screens/Welcome';
import { Register, SignIn } from './screens/Auth';
import Dashboard from './screens/Dashboard';
import Import from './screens/Import';
import Videos from './screens/Videos';
import Clips from './screens/Clips';
import Captions from './screens/Captions';
import Editor from './screens/Editor';
import Models from './screens/Models';
import Analyze from './screens/Analyze';
import Buffer from './screens/Buffer';
import Composer from './screens/Composer';
import Calendar from './screens/Calendar';
import Queue from './screens/Queue';
import Analytics from './screens/Analytics';
import Success from './screens/Success';
import Settings from './screens/Settings';

const SCREENS = {
  '/dashboard': Dashboard,
  '/import': Import,
  '/videos': Videos,
  '/clips': Clips,
  '/captions': Captions,
  '/editor': Editor,
  '/models': Models,
  '/analyze': Analyze,
  '/buffer': Buffer,
  '/composer': Composer,
  '/calendar': Calendar,
  '/queue': Queue,
  '/analytics': Analytics,
  '/success': Success,
  '/settings': Settings,
};

export default function App() {
  const { route, signedIn, navigate } = useStore();
  const path = route?.path || '/';

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [path]);

  useEffect(() => {
    if (signedIn && path === '/') navigate('/dashboard');
  }, [signedIn, path, navigate]);

  if (path === '/register') return (<><Register /><ToastHost /></>);
  if (path === '/signin') return (<><SignIn /><ToastHost /></>);
  if (path === '/welcome' || path === '/') return (<><Welcome /><ToastHost /></>);
  if (!signedIn) return (<><Welcome /><ToastHost /></>);

  const Screen = SCREENS[path] || Dashboard;

  return (
    <>
      <Shell>
        <Screen />
      </Shell>
      <ToastHost />
    </>
  );
}

import { NavLink } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard,
  Rocket,
  FileText,
  Briefcase,
  FolderKanban,
  UserCircle,
  Building2,
  Users,
  MessageSquare,
  Bell,
  Search,
  Shield,
  ClipboardList,
  ScrollText,
  Flag,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/store/authStore';
import { cn } from '@/lib/cn';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const studentNav: NavItem[] = [
  { label: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
  { label: 'My Startups', to: '/student/startups', icon: Rocket },
  { label: 'My Applications', to: '/student/applications', icon: FileText },
  { label: 'Join Requests', to: '/student/join-requests', icon: ClipboardList },
  { label: 'Portfolio', to: '/student/portfolio', icon: FolderKanban },
  { label: 'Profile', to: '/student/profile', icon: UserCircle },
];

const companyNav: NavItem[] = [
  { label: 'Organization', to: '/company/org', icon: Building2 },
  { label: 'Members', to: '/company/org/members', icon: Users },
  { label: 'Opportunities', to: '/company/opportunities', icon: Briefcase },
  { label: 'Projects', to: '/company/projects', icon: FolderKanban },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Startup Reviews', to: '/admin/startups/reviews', icon: Rocket },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Organizations', to: '/admin/orgs', icon: Building2 },
  { label: 'Reports', to: '/admin/reports', icon: Flag },
  { label: 'Audit Logs', to: '/admin/audit-logs', icon: ScrollText },
];

const sharedNav: NavItem[] = [
  { label: 'Messages', to: '/messages', icon: MessageSquare },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Search', to: '/search', icon: Search },
  { label: 'Security', to: '/settings/security', icon: Shield },
];

const discoveryNav: NavItem[] = [
  { label: 'Startups', to: '/startups', icon: Rocket },
  { label: 'Opportunities', to: '/opportunities', icon: Briefcase },
  { label: 'Projects', to: '/projects', icon: FolderKanban },
  { label: 'Organizations', to: '/organizations', icon: Building2 },
];

function NavGroup({ label, items }: { label: string; items: NavItem[] }): JSX.Element {
  return (
    <div className="mb-5">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
              )
            }
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed }: SidebarProps): JSX.Element {
  const { isStudent, isCompanyAdmin, isCompanyMember, isUniversityAdmin } = useAuth();
  const reducedMotion = useReducedMotion();

  return (
    <motion.aside
      className="flex h-full shrink-0 flex-col overflow-hidden border-r border-white/10 bg-black/40 px-2 py-4 backdrop-blur-md"
      initial={false}
      animate={{ width: collapsed ? 0 : 224 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'tween', duration: 0.25, ease: 'easeOut' }}
    >
      {isStudent && <NavGroup label="Student" items={studentNav} />}
      {(isCompanyAdmin || isCompanyMember) && <NavGroup label="Company" items={companyNav} />}
      {isUniversityAdmin && <NavGroup label="Admin" items={adminNav} />}
      <NavGroup label="Discover" items={discoveryNav} />
      <NavGroup label="General" items={sharedNav} />

      {!isUniversityAdmin && (
        <div className="mt-auto px-3 py-3">
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5 hover:text-zinc-300 ${
                isActive ? 'bg-white/5 text-white' : 'text-zinc-500'
              }`
            }
          >
            <Flag size={16} />
            My Reports
          </NavLink>
        </div>
      )}
    </motion.aside>
  );
}

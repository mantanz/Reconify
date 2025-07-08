import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { name: 'Home', path: '/home' },
  { name: 'Config', path: '/config' },
  { name: 'SOT', path: '/sot' },
  { name: 'Reconciliation', path: '/reconciliation' },
  { name: 'Recertification', path: '/recertification' },
  { name: 'Reports', path: '/reports' },
  { name: 'Audit Trails', path: '/audit-trails' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  function toggle() {
    setOpen((prev) => !prev);
  }

  function close() {
    setOpen(false);
  }

  return (
    <header className="bg-primary text-white">
      <div>
        <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex-shrink-0 text-lg font-semibold">Reconify</div>

          {/* Links */}
          <nav className="hidden md:flex space-x-10 relative">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors h-full flex items-center ${isActive ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Avatar */}
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-white font-semibold">
              U
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 
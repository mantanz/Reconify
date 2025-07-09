import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiGrid } from 'react-icons/fi';
import logo from '../assets/reconfiy_logo.png';

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
    <header className="fixed top-0 left-0 w-full z-50 bg-primary text-white">
      <div>
        <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src={logo} alt="Reconify Logo" className="h-10 w-10 object-contain" />
            <span className="text-xl font-semibold">Reconify</span>
          </div>

          {/* Links */}
          <nav className="hidden md:flex space-x-10 relative">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `text-base font-medium transition-colors h-full flex items-center ${isActive ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Avatar */}
          <div className="flex items-center gap-6">
            <FiGrid className="w-6 h-6 text-white opacity-80 hover:opacity-100 cursor-pointer mr-2" />
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-white font-semibold">
              U
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 
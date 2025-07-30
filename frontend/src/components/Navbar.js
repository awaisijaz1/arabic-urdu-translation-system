import React, { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Home, 
  Upload, 
  Languages, 
  CheckSquare, 
  Database, 
  BarChart3, 
  LogOut, 
  User,
  Menu,
  X,
  Wifi,
  WifiOff
} from 'lucide-react';

const Navbar = ({ healthStatus }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Upload Files', href: '/upload', icon: Upload },
    { name: 'Translation Jobs', href: '/translation', icon: Languages },
    { name: 'Evaluation', href: '/evaluation', icon: CheckSquare },
    { name: 'Ground Truth', href: '/ground-truth', icon: Database },
    { name: 'Metrics', href: '/metrics', icon: BarChart3 },
  ];

  const isActive = (href) => location.pathname === href;

  return (
    <nav className="bg-white shadow-lg mb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20">
          <div className="flex items-center flex-1">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/dashboard" className="text-xl font-bold text-blue-600">
                Translation Evaluation
              </Link>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:space-x-6">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive(item.href)
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    <span className="hidden lg:inline">{item.name}</span>
                    <span className="lg:hidden">{item.name.split(' ')[0]}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:space-x-3 flex-shrink-0 ml-8">
            {/* User Menu - Compact Version */}
            <div className="relative flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700 max-w-20 truncate">{user?.username}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {user?.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center px-2 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">Logout</span>
            </button>

            {/* Health Status - Compact */}
            <div className="flex items-center border-l border-gray-200 pl-2" title={`System Status: ${healthStatus?.status || 'unknown'}`}>
              {healthStatus?.status === 'healthy' ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="ml-1 text-xs text-gray-500 hidden xl:inline">
                {healthStatus?.status || 'unknown'}
              </span>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-base font-medium ${
                    isActive(item.href)
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
          
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <User className="h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">{user?.username}</div>
                <div className="text-sm font-medium text-gray-500">{user?.email}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                onClick={logout}
                className="flex items-center w-full px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 
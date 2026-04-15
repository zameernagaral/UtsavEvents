import { Menu, X, Gamepad2, Trophy, BookOpen, LayoutGrid } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Header({ minimal = false }: { minimal?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndicatorStyle, setActiveIndicatorStyle] = useState({ left: 0, width: 0 });
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path.startsWith('#')) {
      return false;
    }
    return location.pathname === path;
  };

  const navItems = [
    { path: '/game', label: 'PLAY GAME', icon: Gamepad2 },
    { path: '/#tournament-stages', label: 'TOURNAMENT', icon: Trophy, isHash: true },
    { path: '/#game-formats', label: 'FORMATS', icon: LayoutGrid, isHash: true },
    { path: '/game/rules', label: 'RULES', icon: BookOpen },
  ];

  // Update sliding indicator position
  useEffect(() => {
    const activeNavItem = document.querySelector('.nav-item.active');
    if (activeNavItem) {
      const { left, width } = activeNavItem.getBoundingClientRect();
      const navContainer = document.querySelector('.nav-container')?.getBoundingClientRect();
      if (navContainer) {
        setActiveIndicatorStyle({
          left: left - navContainer.left,
          width: width,
        });
      }
    }
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo - Chess Knight */}
          {minimal ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="text-4xl lg:text-5xl filter drop-shadow-lg">♞</span>
              </div>
              <div>
                <span className="font-black text-lg lg:text-xl text-foreground tracking-tight">
                  GRANDMASTER<span className="text-primary"> GAMBIT 4.0</span>
                </span>
              </div>
            </div>
          ) : (
            <Link 
              to="/" 
              className="flex items-center gap-2 group"
            >
              <div className="relative">
                <span className="text-4xl lg:text-5xl filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300">♞</span>
                <div className="absolute -inset-2 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <span className="font-black text-lg lg:text-xl text-foreground tracking-tight">
                  GRANDMASTER<span className="text-primary"> GAMBIT 4.0</span>
                </span>
              </div>
            </Link>
          )}

          {!minimal && (
            <>
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-6">
                <div className="relative flex items-center nav-container">
                  {/* Sliding indicator bar */}
                  <div 
                    className="absolute bottom-0 h-0.5 bg-primary rounded-full transition-all duration-300 ease-in-out"
                    style={{ 
                      left: activeIndicatorStyle.left, 
                      width: activeIndicatorStyle.width,
                      opacity: activeIndicatorStyle.width > 0 ? 1 : 0
                    }}
                  />
                  
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = !item.isHash && isActive(item.path);
                    
                    if (item.isHash) {
                      return (
                        <a
                          key={item.path}
                          href={item.path}
                          className="relative px-3 py-2 text-foreground/80 hover:text-primary text-sm font-bold tracking-wide transition-colors duration-300 group nav-item"
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            <Icon size={16} className="group-hover:rotate-6 transition-transform" />
                            {item.label}
                          </span>
                        </a>
                      );
                    }
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`relative px-3 py-2 text-sm font-bold tracking-wide transition-colors duration-300 group nav-item ${
                          active ? 'active text-primary' : 'text-foreground/80 hover:text-primary'
                        }`}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <Icon size={16} className="group-hover:rotate-6 transition-transform" />
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* CTA Button */}
                <Link
                  to="/game"
                  className="ml-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold tracking-wide hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
                >
                  PLAY NOW
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button 
                className="md:hidden relative w-10 h-10 rounded-full bg-secondary/50 hover:bg-secondary transition-colors flex items-center justify-center"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
              >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </>
          )}
        </div>
      </nav>

      {!minimal && (
        <div 
          className={`
            md:hidden absolute left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 
            transition-all duration-300 ease-in-out overflow-hidden
            ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              
              if (item.isHash) {
                return (
                  <a
                    key={item.path}
                    href={item.path}
                    className="flex items-center gap-3 px-4 py-3 text-foreground/80 hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-300 group"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="p-2 bg-secondary/50 rounded-lg group-hover:bg-primary/10 transition-colors">
                      <Icon size={18} className="group-hover:rotate-6 transition-transform" />
                    </div>
                    <span className="font-bold tracking-wide">{item.label}</span>
                  </a>
                );
              }
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                    isActive(item.path) 
                      ? 'text-primary bg-primary/10' 
                      : 'text-foreground/80 hover:text-primary hover:bg-primary/5'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    isActive(item.path) 
                      ? 'bg-primary/20' 
                      : 'bg-secondary/50 group-hover:bg-primary/10'
                  }`}>
                    <Icon size={18} className="group-hover:rotate-6 transition-transform" />
                  </div>
                  <span className="font-bold tracking-wide">{item.label}</span>
                  {isActive(item.path) && (
                    <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}

            {/* Mobile CTA */}
            <div className="pt-4 mt-2 border-t border-border/50">
              <Link
                to="/game"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold tracking-wide hover:bg-primary/90 transition-all duration-300 group"
                onClick={() => setIsOpen(false)}
              >
                <Gamepad2 size={18} className="group-hover:rotate-12 transition-transform" />
                PLAY GAME
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
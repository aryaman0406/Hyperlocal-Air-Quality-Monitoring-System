import React from 'react';
import { Map as MapIcon, BarChart3, Settings } from 'lucide-react';
import styles from './Navbar.module.css';

interface NavbarProps {
    activeView: string;
    onViewChange: (view: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeView, onViewChange }) => {
    return (
        <nav className={styles.navbar}>
            <div className={styles.logoContainer}>
                <button
                    className={styles.logoButton}
                    onClick={() => onViewChange('dashboard')}
                    title="Go to AtmosPulse Dashboard"
                    aria-label="Dashboard Home"
                >
                    <div className={styles.logo}>
                        <img 
                            src="/logo.png" 
                            alt="AtmosPulse Logo" 
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                    </div>
                </button>
            </div>

            <div className={styles.navItems}>
                <NavItem 
                    icon={<BarChart3 size={24} />} 
                    title="Dashboard"
                    active={activeView === 'dashboard'}
                    onClick={() => onViewChange('dashboard')}
                />
                <NavItem 
                    icon={<MapIcon size={24} />} 
                    title="Hyperlocal Map"
                    active={activeView === 'map'}
                    onClick={() => onViewChange('map')}
                />
            </div>

            <div className={styles.bottomItems}>
                <NavItem 
                    icon={<Settings size={24} />} 
                    title="Settings"
                    active={activeView === 'settings'}
                    onClick={() => onViewChange('settings')}
                />
            </div>
        </nav>
    );
};

interface NavItemProps {
    icon: React.ReactNode;
    title?: string;
    active?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, title, active, onClick }) => (
    <button 
        className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
        onClick={onClick}
        title={title}
        aria-label={title}
    >
        {icon}
    </button>
);

export default Navbar;

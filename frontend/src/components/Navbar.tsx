import React from 'react';
import { Wind, Map as MapIcon, BarChart3, Bell, Settings } from 'lucide-react';
import styles from './Navbar.module.css';

interface NavbarProps {
    activeView: string;
    onViewChange: (view: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeView, onViewChange }) => {
    return (
        <nav className={styles.navbar}>
            <div className={styles.logoContainer}>
                <div className={styles.logo}>
                    <Wind className="text-white" size={24} />
                </div>
            </div>

            <div className={styles.navItems}>
                <NavItem 
                    icon={<BarChart3 size={24} />} 
                    active={activeView === 'dashboard'}
                    onClick={() => onViewChange('dashboard')}
                />
                <NavItem 
                    icon={<MapIcon size={24} />} 
                    active={activeView === 'map'}
                    onClick={() => onViewChange('map')}
                />
                <NavItem 
                    icon={<Bell size={24} />} 
                    active={activeView === 'notifications'}
                    onClick={() => onViewChange('notifications')}
                />
            </div>

            <div className={styles.bottomItems}>
                <NavItem 
                    icon={<Settings size={24} />} 
                    active={activeView === 'settings'}
                    onClick={() => onViewChange('settings')}
                />
            </div>
        </nav>
    );
};

interface NavItemProps {
    icon: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, active, onClick }) => (
    <button 
        className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
        onClick={onClick}
    >
        {icon}
    </button>
);

export default Navbar;

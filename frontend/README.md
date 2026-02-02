# Frontend - Hyperlocal Air Quality Monitor

React + TypeScript frontend application for visualizing real-time air quality data.

## 🚀 Quick Start

### Prerequisites
- Node.js 16 or higher
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment (optional):**
```bash
cp .env.example .env
# Edit .env if needed
```

3. **Run development server:**
```bash
npm run dev
```

Application will be available at: http://localhost:5173

## 📁 Project Structure

```
frontend/
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── public/                # Static assets
└── src/
    ├── main.tsx           # Application entry point
    ├── App.tsx            # Root component
    ├── App.css            # Global styles
    ├── index.css          # Base styles
    ├── assets/            # Images, icons
    ├── components/        # React components
    │   ├── Dashboard.tsx
    │   ├── Favorites.tsx
    │   ├── Forecast.tsx
    │   ├── HealthAdvice.tsx
    │   ├── MapView.tsx
    │   ├── Navbar.tsx
    │   ├── Notifications.tsx
    │   └── Settings.tsx
    ├── pages/             # Page components
    │   └── Dashboard.tsx
    └── services/          # API services
        └── api.ts         # API client
```

## 🎨 Components

### MapView
Interactive map displaying AQI data across locations using Leaflet.

### Forecast
48-hour AQI forecast visualization with charts.

### HealthAdvice
Personalized health recommendations based on current AQI.

### Favorites
Manage and track favorite locations.

### Notifications
Real-time AQI alerts and updates.

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Code Style

- Use TypeScript strict mode
- Follow React best practices
- Use functional components with hooks
- Keep components small and focused

### Component Example

```typescript
import React from 'react';

interface AQICardProps {
  location: string;
  aqi: number;
  timestamp: Date;
}

const AQICard: React.FC<AQICardProps> = ({ location, aqi, timestamp }) => {
  return (
    <div className="aqi-card">
      <h3>{location}</h3>
      <p>AQI: {aqi}</p>
      <small>{timestamp.toLocaleString()}</small>
    </div>
  );
};

export default AQICard;
```

## 📦 Technologies

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Leaflet** - Interactive maps
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Framer Motion** - Animations
- **Lucide React** - Icons

## 🔌 API Integration

The frontend connects to the backend API at `http://localhost:8000`

### API Service (`services/api.ts`)

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export const getAQI = async (lat: number, lon: number) => {
  const response = await axios.get(`${API_BASE_URL}/aqi`, {
    params: { lat, lon }
  });
  return response.data;
};

export const getForecast = async (lat: number, lon: number) => {
  const response = await axios.get(`${API_BASE_URL}/forecast`, {
    params: { lat, lon }
  });
  return response.data;
};
```

### WebSocket Connection

```typescript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Update UI with real-time data
};
```

## 🎨 Styling

- CSS Modules for component-specific styles
- Global styles in `index.css`
- Responsive design for mobile and desktop

## 🏗️ Building for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Production Optimization

- Code splitting
- Tree shaking
- Minification
- Asset optimization

## 🚢 Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
```

### Docker

```dockerfile
FROM node:16-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🧪 Testing

Add testing with:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

Example test:
```typescript
import { render, screen } from '@testing-library/react';
import AQICard from './AQICard';

test('renders AQI card', () => {
  render(<AQICard location="Delhi" aqi={150} timestamp={new Date()} />);
  expect(screen.getByText('Delhi')).toBeInTheDocument();
});
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints for tablet and desktop
- Touch-friendly interface

## ♿ Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support

## 🐛 Debugging

### Development Tools

- React DevTools
- Browser DevTools
- Vite HMR for instant updates

### Common Issues

**API connection fails:**
```typescript
// Check CORS settings in backend
// Verify API URL is correct
```

**Map not loading:**
```typescript
// Ensure Leaflet CSS is imported
import 'leaflet/dist/leaflet.css';
```

## 📝 License

MIT License - see [LICENSE](../LICENSE) file
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

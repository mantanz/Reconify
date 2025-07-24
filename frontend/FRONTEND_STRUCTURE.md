# Frontend Folder Structure Documentation

## Overview

The frontend is organized using a feature-based architecture that promotes maintainability, scalability, and clear separation of concerns. Each feature has its own directory with related components, utilities, and styles.

## Directory Structure

```
frontend/
├── public/                    # Static assets
│   ├── reconfiy_logo.png     # Application logo
│   └── index.html            # HTML template
├── src/
│   ├── auth/                 # Authentication components
│   │   ├── AuthContext.js    # React context for auth state
│   │   ├── Login.js          # Login page component
│   │   └── ProtectedRoute.js # Route protection component
│   ├── components/           # Feature-based components
│   │   ├── common/           # Shared/common components
│   │   │   ├── AppLauncher.js # Quick access launcher
│   │   │   └── UserMenu.js   # User menu component
│   │   ├── panels/           # Panel management features
│   │   │   ├── AddPanel.js   # Add new panel
│   │   │   ├── DeletePanel.js # Delete existing panel
│   │   │   ├── ModifyPanel.js # Modify panel configuration
│   │   │   └── PanelDataTable.js # Panel data display
│   │   ├── reconciliation/   # Reconciliation features
│   │   │   ├── Reconciliation.js # Main reconciliation component
│   │   │   └── Reconsummary.js # Reconciliation summary
│   │   ├── summaries/        # Summary and reporting
│   │   │   ├── FinalSummary.js # Final status summary
│   │   │   ├── InitialSummary.js # Initial status summary
│   │   │   └── UserSummary.js # User-wise summary
│   │   └── uploads/          # File upload features
│   │       └── SOTUpload.js  # Source of Truth upload
│   ├── styles/               # Global styles and themes
│   │   └── global.css        # Global CSS styles
│   ├── utils/                # Utility functions and constants
│   │   ├── api.js           # API functions
│   │   └── constants.js     # Application constants
│   ├── assets/              # Static assets (images, icons)
│   ├── App.js               # Main application component
│   ├── index.js             # Application entry point
│   └── index.css            # Base styles
├── package.json             # Dependencies and scripts
└── README.md               # Project documentation
```

## Feature Organization

### 1. Authentication (`/auth`)
- **Purpose**: Handle user authentication and session management
- **Components**: Login, ProtectedRoute, AuthContext
- **Features**: Google OAuth integration, JWT token management

### 2. Common Components (`/components/common`)
- **Purpose**: Reusable components used across multiple features
- **Components**: AppLauncher, UserMenu
- **Features**: Navigation, user interface elements

### 3. Panel Management (`/components/panels`)
- **Purpose**: Manage panel configurations and data
- **Components**: AddPanel, DeletePanel, ModifyPanel, PanelDataTable
- **Features**: CRUD operations for panels, data visualization

### 4. Reconciliation (`/components/reconciliation`)
- **Purpose**: Handle data reconciliation processes
- **Components**: Reconciliation, Reconsummary
- **Features**: File upload, data processing, status tracking

### 5. Summaries (`/components/summaries`)
- **Purpose**: Display various summary reports
- **Components**: InitialSummary, FinalSummary, UserSummary
- **Features**: Data aggregation, reporting, filtering

### 6. Uploads (`/components/uploads`)
- **Purpose**: Handle file upload operations
- **Components**: SOTUpload
- **Features**: File validation, upload progress, error handling

## Utility Organization

### 1. API Functions (`/utils/api.js`)
- **Purpose**: Centralized API communication
- **Features**: HTTP requests, error handling, response processing

### 2. Constants (`/utils/constants.js`)
- **Purpose**: Application-wide configuration values
- **Features**: API endpoints, UI configuration, status codes

## Style Organization

### 1. Global Styles (`/styles/global.css`)
- **Purpose**: Application-wide styling and themes
- **Features**: CSS variables, utility classes, responsive design

## Best Practices

### 1. Component Structure
- Each component should be self-contained
- Use descriptive file and component names
- Keep components focused on a single responsibility

### 2. Import Organization
- Group imports by type (React, third-party, local)
- Use relative paths for local imports
- Maintain consistent import ordering

### 3. File Naming
- Use PascalCase for component files
- Use camelCase for utility files
- Use kebab-case for CSS files

### 4. Code Organization
- Keep related functionality together
- Separate concerns (UI, logic, data)
- Use consistent formatting and structure

## Development Guidelines

### 1. Adding New Features
1. Create a new directory under `/components` for the feature
2. Add feature-specific components
3. Update imports in `App.js` if needed
4. Add any new utilities to `/utils`
5. Update this documentation

### 2. Component Development
1. Start with a functional component
2. Add props validation if needed
3. Include error handling
4. Add loading states
5. Test with different data scenarios

### 3. Styling
1. Use the global CSS classes when possible
2. Follow the established design system
3. Ensure responsive design
4. Test across different browsers

### 4. State Management
1. Use React Context for global state
2. Use local state for component-specific data
3. Avoid prop drilling
4. Keep state as close to where it's used as possible

## File Dependencies

### Core Dependencies
- `App.js` → All feature components
- `AuthContext.js` → All authenticated components
- `api.js` → All components making API calls
- `constants.js` → All components using configuration

### Feature Dependencies
- Panel components → `api.js`, `constants.js`
- Reconciliation components → `api.js`, `constants.js`
- Summary components → `api.js`, `constants.js`
- Upload components → `api.js`, `constants.js`

## Maintenance

### Regular Tasks
1. Review and update dependencies
2. Clean up unused imports
3. Refactor large components
4. Update documentation
5. Review performance

### Code Quality
1. Use ESLint for code consistency
2. Follow React best practices
3. Write meaningful commit messages
4. Test components thoroughly
5. Review code before merging

## Future Enhancements

### Planned Improvements
1. Add TypeScript for better type safety
2. Implement component testing
3. Add storybook for component documentation
4. Optimize bundle size
5. Add performance monitoring

### Scalability Considerations
1. Consider code splitting for large features
2. Implement lazy loading for components
3. Add caching strategies
4. Optimize API calls
5. Monitor bundle size growth 
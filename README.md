# Saifu (財布, lit. wallet)

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-7.2-blue?logo=mui)](https://mui.com/)

Saifu is a modern digital wallet application for managing event tickets with blockchain integration. It allows users to collect, transfer, and access tickets through QR codes while providing a seamless authentication experience using WebAuthn technology.

## ✨ Features

### 🔐 Secure Authentication

- **WebAuthn Integration**: Modern, passwordless authentication
- **Biometric Support**: Fingerprint and face recognition ready
- **Virto Signer Compatible**: Ready for blockchain ecosystem integration
- **Multi-language Support**: English and Spanish localization

### 🎫 Ticket Management

- **Digital Ticket Collection**: Store and organize event tickets
- **QR Code Access**: Generate and scan QR codes for event entry
- **Ticket Transfer**: Send tickets to other users securely
- **Event Overview**: Track upcoming and past events

### 🌐 Modern UI/UX

- **Material Design**: Clean, intuitive interface with Material-UI
- **Responsive Design**: Works seamlessly across desktop and mobile
- **Dark/Light Theme**: Automatic theme switching
- **Real-time Updates**: Live data synchronization

### 🔗 Blockchain Integration

- **Wallet Functionality**: Built on blockchain principles
- **Cryptographic Security**: Enhanced security through cryptography
- **Decentralized Ready**: Prepared for Web3 integration

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **Yarn** package manager
- **Modern Browser** with WebAuthn support (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd saifu
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Run the development server**

   ```bash
   yarn dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `yarn dev` - Start development server with Turbopack
- `yarn build` - Build the application for production
- `yarn start` - Start production server
- `yarn lint` - Run ESLint for code quality

## 🏗️ Project Structure

```
saifu/
├── app/                          # Next.js App Router
│   ├── (authenticated)/          # Protected routes
│   │   ├── events/              # Event management
│   │   └── tickets/             # Ticket management
│   ├── (public)/                # Public routes
│   │   └── page.tsx             # Login page
│   ├── api/                     # API routes
│   │   ├── auth/                # Authentication endpoints
│   │   └── credentials/         # Credential management
│   ├── _components/             # Shared components
│   │   ├── Auth/               # Authentication components
│   │   ├── Events/             # Event-related components
│   │   ├── Layout/             # Layout components
│   │   ├── MarkdownRender/     # Markdown rendering
│   │   └── Tickets/            # Ticket components
│   ├── hooks/                  # Custom React hooks
│   ├── i18n/                   # Internationalization
│   ├── lib/                    # Utility libraries
│   │   └── webauthn/           # WebAuthn implementation
│   └── providers/              # React providers
├── packages/                   # Shared packages
│   ├── ui/                     # Custom UI components
│   └── arraybuffer-base64/     # ArrayBuffer utilities
├── public/                     # Static assets
└── data/                       # Data files
```

## 🔧 Technology Stack

### Core Technologies

- **Next.js 15** - React framework with App Router
- **React 19** - UI library with concurrent features
- **TypeScript 5.3** - Type-safe JavaScript
- **Material-UI 7.2** - Component library and design system

### Authentication & Security

- **WebAuthn** - Modern authentication standard
- **Virto Signer** - Blockchain signing integration

### UI & Styling

- **Material-UI Components** - Pre-built UI components
- **@emotion/react & @emotion/styled** - CSS-in-JS styling
- **@fontsource/roboto** - Google Fonts integration

### Data & Internationalization

- **next-intl 4.3** - Internationalization framework
- **marked-react** - Markdown rendering
- **libphonenumber-js** - Phone number validation

### Development Tools

- **ESLint** - Code linting
- **Turbopack** - Next.js bundling optimization
- **Turbo Generators** - Code generation tools

## 🧪 Testing

### Mock Users

The application includes pre-configured test users:

- **Username**: `alice` - Demo user with sample tickets
- **Username**: `bob` - Another demo user for testing transfers

### Authentication Flow

1. Visit the login page at `/`
2. Enter a username (e.g., `alice` or `bob`)
3. Complete WebAuthn authentication
4. Access the authenticated dashboard

### Features to Test

- ✅ User registration with new accounts
- ✅ Login with existing users
- ✅ Event browsing and ticket viewing
- ✅ QR code generation for tickets
- ✅ Ticket transfer functionality
- ✅ Multi-language switching
- ✅ Theme switching (light/dark)

## 🌐 Internationalization

The application supports multiple languages:

- **English** (en) - Default language
- **Spanish** (es) - Complete Spanish translation

### Adding New Languages

1. Create a new file in `app/i18n/messages/[locale].json`
2. Copy the structure from `en.json`
3. Translate all strings
4. Update the configuration to include the new locale

## 🔐 Security Features

### WebAuthn Implementation

- **Mock Implementation**: Fully functional with realistic data
- **Production Ready**: Easy migration to real WebAuthn
- **Blockchain Compatible**: Works with Virto Signer ecosystem

### Security Best Practices

- **Type Safety**: Full TypeScript coverage
- **Input Validation**: Comprehensive form validation
- **Error Handling**: Graceful error management
- **Session Management**: Secure client-side sessions

## 🚀 Deployment

### Vercel (Recommended)

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Deploy automatically with optimal settings

### Other Platforms

The application can be deployed on any platform that supports Next.js:

- **Netlify** - Static site hosting
- **AWS Amplify** - Full-stack deployment
- **Digital Ocean** - VPS deployment
- **Railway** - Simple deployment platform

### Environment Variables

No environment variables are required for basic functionality. The application uses mock data for development.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper TypeScript types
4. **Add tests** for new functionality
5. **Run linting**: `yarn lint`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and patterns
- Add TypeScript types for all new code
- Include comprehensive error handling
- Write meaningful commit messages
- Update documentation as needed

## 📝 API Documentation

### Authentication Endpoints

#### `POST /api/auth/register`

Register a new user account.

**Request Body:**

```json
{
  "username": "string",
  "displayName": "string",
  "email": "string (optional)",
  "firstName": "string (optional)",
  "lastName": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "username": "string",
    "displayName": "string",
    "credentials": [...]
  }
}
```

#### `GET /api/credentials?username={username}`

Retrieve user credentials for authentication.

**Query Parameters:**

- `username` - The username to fetch credentials for

**Response:**

```json
{
  "credentials": [...],
  "challenge": "string",
  "rpId": "string",
  "origin": "string"
}
```

## 🔮 Roadmap

### Phase 1: Current Features ✅

- [x] WebAuthn authentication (mock)
- [x] Basic ticket management
- [x] QR code generation
- [x] Multi-language support
- [x] Material-UI integration

### Phase 2: Enhanced Features 🔄

- [ ] Real WebAuthn integration
- [ ] Blockchain registration
- [ ] Advanced ticket trading
- [ ] Mobile app development
- [ ] Advanced analytics

### Phase 3: Ecosystem Integration 🌟

- [ ] Virto Signer integration
- [ ] Cross-platform compatibility
- [ ] Advanced security features
- [ ] Enterprise features
- [ ] Community governance

## 📄 License

This project is private and proprietary. All rights reserved.

## 👥 Team

Built with ❤️ by the Kippu team

- **Development**: Modern React/Next.js best practices
- **Design**: Material Design principles
- **Security**: WebAuthn and blockchain standards
- **Performance**: Optimized with Turbopack and best practices

## 📞 Support

For support and questions:

- **Documentation**: Check the inline code documentation
- **Issues**: Report bugs and feature requests
- **Discussions**: Join our community discussions

---

**Saifu** - Your secure, modern digital ticket wallet 🗂️✨

# BMS (Business Management System)

A comprehensive business management system built with React TypeScript frontend and Express.js backend.

## Project Structure

```
BMS/
├── bms-frontend-ts/     # React TypeScript frontend
├── server/             # Express.js backend with MongoDB
├── start.sh            # Quick start script
└── *.md                # Documentation files
```

## Features

- **User Management**: Authentication, authorization, and role-based access control
- **Invoice Management**: Create, view, edit invoices with file upload support
- **Supplier Management**: Manage suppliers and their information
- **Product Management**: Track products and inventory
- **Bills Management**: Handle billing operations
- **File Management**: Upload, view, and download invoice files
- **Responsive Design**: Mobile-friendly interface

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation & Run

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd BMS
   ```

2. **Quick start (recommended):**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

3. **Manual setup:**
   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../bms-frontend-ts
   npm install

   # Build frontend
   npm run build

   # Start backend
   cd ../server
   npm start
   ```

4. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:5002

## Development

### Frontend Development
```bash
cd bms-frontend-ts
npm start  # Runs on http://localhost:3001
```

### Backend Development
```bash
cd server
npm run dev  # If you have nodemon configured
# or
npm start
```

## Environment Variables

Create `.env` file in the `server/` directory:

```env
PORT=5002
MONGO_URI=mongodb://localhost:27017/bms
JWT_SECRET=your-secret-key
```

## API Documentation

The backend provides RESTful APIs for:
- Authentication (`/api/auth`)
- Users (`/api/users`)
- Invoices (`/api/invoices`)
- Suppliers (`/api/suppliers`)
- Products (`/api/products`)
- Bills (`/api/bills`)

## Technologies Used

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Axios for API calls
- React Router for navigation
- Lucide React for icons

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- bcrypt for password hashing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

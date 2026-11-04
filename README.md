# VSPARK Registration Portal

Registration portal for the VSPARK Prompt Engineering Competition (AI Video Generation Challenge), COMSATS University Islamabad.

## Run
```bash
npm install
ADMIN_USER=admin ADMIN_PASSWORD=your-password npm start
# Windows: set ADMIN_PASSWORD=your-password && npm start
```
- Registration page: http://localhost:3000
- Admin panel: http://localhost:3000/admin (default login `admin` / `admin123`. Change it with ADMIN_PASSWORD.)

## Structure
- `server.js`: Express API, validation, storage, admin routes
- `options.js`: institute and degree program lists (edit here to add more)
- `public/index.html`, `app.js`: registration form
- `public/admin.html`, `admin.js`: admin panel
- `data/registrations.json`: saved registrations (created automatically)

## Rules
- COMSATS institutes require the format `FA23-BSE-062`. Other institutes accept any roll number.
- The same person (institute + reg no) can't register twice.

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at ${uploadsDir}`);
}

// Initialize the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Function to start server with port fallback
function startServer(initialPort) {
  let currentPort = initialPort;
  
  const server = createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      currentPort++;
      console.log(`Port ${initialPort} is in use, trying ${currentPort} instead.`);
      server.listen(currentPort);
    } else {
      console.error('Server error:', err);
    }
  });
  
  server.listen(currentPort, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${currentPort}`);
  });
  
  return server;
}

app.prepare().then(() => {
  // Import and initialize the database when the server starts
  try {
    // Use dynamic import with proper extension
    const dbModule = './src/lib/database';
    Promise.resolve(import(dbModule)).then(({ initializeDatabase }) => {
      initializeDatabase().then(() => {
        console.log('Database connected successfully on server start');
        
        // Also initialize database schema
        const dbInitModule = './src/lib/db-init';
        Promise.resolve(import(dbInitModule)).then(({ initializeDatabase: initSchema }) => {
          initSchema().then(() => {
            console.log('Database schema initialized successfully');
          }).catch(err => {
            console.error('Failed to initialize database schema:', err);
          });
        }).catch(err => {
          console.error('Failed to import db-init module:', err);
        });
      }).catch(err => {
        console.error('Failed to connect to database:', err);
      });
    }).catch(err => {
      console.error('Failed to import database module:', err);
    });
  } catch (error) {
    console.error('Error initializing database:', error);
  }

  // Start the server with port fallback
  startServer(port);
}); 
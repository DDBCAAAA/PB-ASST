const dotenv = require('dotenv');
const app = require('./app');
const { initDb } = require('./config/database');

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initDb();

    app.listen(PORT, () => {
      console.log(`PB Assistant backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start PB Assistant backend', error);
    process.exit(1);
  }
};

startServer();

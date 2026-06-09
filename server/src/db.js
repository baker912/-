const { Sequelize } = require('sequelize');

function getSequelize() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const url = new URL(databaseUrl);
  const username = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const database = url.pathname.replace(/^\//, '');

  return new Sequelize(database, username, password, {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      charset: 'utf8mb4'
    },
    define: {
      timestamps: true,
      underscored: true
    }
  });
}

module.exports = { getSequelize };

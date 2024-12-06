const {Sequelize} = require('sequelize');

module.exports = new Sequelize(
    'telega_bot',
    'postgres',
    '1234',
    {
        host:'127.0.0.1',
        port: '5432',
        dialect: 'postgres'
    }
)
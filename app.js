const EXPRESS = require('express');
const MYSQL = require('mysql');
const CORS = require('cors');

const APP = EXPRESS();
APP.use(EXPRESS.json());
APP.use(CORS());

const CONNECTION = MYSQL.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD || '', // Usa una contraseña de entorno o predeterminada
    database: process.env.DB_NAME || 'test_db' // Usa una base de datos predeterminada para pruebas
});

// Conectar con la base de datos
CONNECTION.connect(function(error) {
    if (error) {
        console.error('Error conectando a la base de datos:', error);
        throw error;
    } else {
        console.log(`Conectado a la base de datos`);
        
        // Definir rutas aquí
        APP.get('/', (req, res) => {
            res.send('¡Conexión exitosa!');
        });

        APP.get('/api/products', (req, res) => {
            CONNECTION.query('SELECT ID as id, descripcion, precio, stock FROM products', (error, rows) => {
                if (error) {
                    res.status(500).send({ error: 'Error en el servidor' });
                } else {
                    res.send(rows);
                }
            });
        });

        APP.post('/api/products', (req, res) => {
            let data = { descripcion: req.body.descripcion, precio: req.body.precio, stock: req.body.stock };
            let sql = "INSERT INTO products SET ?";
            CONNECTION.query(sql, data, function(error, results) {
                if (error) {
                    res.status(500).send({ error: 'Error en el servidor' });
                } else {
                    Object.assign(data, { id: results.insertId });
                    res.send(data);
                }
            });
        });

        APP.put('/api/products/:id', (req, res) => {
            let id = req.params.id;
            let { descripcion, precio, stock } = req.body;
            let sql = "UPDATE products SET descripcion = ?, precio = ?, stock = ? WHERE id = ?";
            CONNECTION.query(sql, [descripcion, precio, stock, id], function(error, results) {
                if (error) {
                    res.status(500).send({ error: 'Error en el servidor' });
                } else {
                    res.send({ affectedRows: results.affectedRows });
                }
            });
        });

        APP.delete('/api/products/:id', (req, res) => {
            CONNECTION.query('DELETE FROM products WHERE id = ?', [req.params.id], function(error, results) {
                if (error) {
                    res.status(500).send({ error: 'Error en el servidor' });
                } else {
                    res.send({ affectedRows: results.affectedRows });
                }
            });
        });
    }
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    APP.listen(PORT, function () {
        console.log('Servidor corriendo en el puerto: ' + PORT);
    });
}

module.exports = APP;


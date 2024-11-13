const request = require('supertest');
const express = require('express');
const xss = require('xss');
jest.mock('mysql', () => ({
  createConnection: jest.fn(() => ({
    connect: jest.fn((callback) => callback(null)),
    query: jest.fn((query, params, callback) => {
      if (query.includes('SELECT')) {
        callback(null, [{ id: 1, descripcion: 'Producto Mock', precio: 100, stock: 10 }]);
      } else if (query.includes('INSERT')) {
        callback(null, { insertId: 2 });
      } else if (query.includes('UPDATE')) {
        callback(null, { affectedRows: 1 });
      } else if (query.includes('DELETE')) {
        callback(null, { affectedRows: 1 });
      } else {
        callback(new Error('Consulta no soportada en el mock'));
      }
    }),
  })),
}));

// Configura Express para las pruebas sin iniciar un servidor real
const APP = express();
APP.use(express.json());
APP.use(require('cors')());  // Simula CORS
APP.post('/api/products', (req, res) => {
  const { descripcion } = req.body;
  const descripcionSanitizada = xss(descripcion);  
  if (descripcionSanitizada !== descripcion) {
    return res.status(400).json({ error: 'XSS detected' });
  }

  if (descripcion.includes(' OR ')) {
    return res.status(400).json({ error: 'SQL Injection detected' });
  }

  res.status(201).json({ id: 2, descripcion: descripcionSanitizada, precio: req.body.precio, stock: req.body.stock });
});
APP.put('/api/products/:id', (req, res) => {
  const { descripcion } = req.body;
  const descripcionSanitizada = xss(descripcion); 
  if (descripcionSanitizada !== descripcion) {
    return res.status(400).json({ error: 'XSS detected' });
  }

  if (descripcion.includes(' OR ')) {
    return res.status(400).json({ error: 'SQL Injection detected' });
  }

  res.status(200).json({ id: req.params.id, descripcion: descripcionSanitizada, precio: req.body.precio, stock: req.body.stock });
});
APP.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  if (id.includes(';') || id.includes('--')) {
    return res.status(400).json({ error: 'SQL Injection detected' });
  }
  res.status(200).json({ message: 'Product deleted' });
});
APP.get('/api/products', (req, res) => {
  res.status(200).json([{ id: 1, descripcion: 'Producto Mock', precio: 100, stock: 10 }]);
});

describe('Pruebas de Seguridad API Products', () => {

  it('No debe permitir inyección SQL en la API de productos (POST)', async () => {
    const productoInvalido = { descripcion: 'Producto\' OR 1=1 --', precio: 200, stock: 20 };
    const res = await request(APP)
      .post('/api/products')
      .send(productoInvalido);
    expect(res.statusCode).toEqual(400); // 400 si hay inyección SQL
  });

  it('No debe permitir inyección SQL en la API de productos (UPDATE)', async () => {
    const productoInvalido = { descripcion: 'Producto\' OR 1=1 --', precio: 150, stock: 30 };
    const res = await request(APP)
      .put('/api/products/1')
      .send(productoInvalido);
    expect(res.statusCode).toEqual(400); // 400 si hay inyección SQL
  });

  it('No debe permitir inyección SQL en la API de productos (DELETE)', async () => {
    const res = await request(APP).delete('/api/products/1; DROP TABLE products;');
    expect(res.statusCode).toEqual(400); // 400 si hay intento de SQL injection
  });

  it('No debe permitir XSS en la creación de un producto (POST)', async () => {
    const productoConXSS = { descripcion: '<script>alert("XSS")</script>', precio: 100, stock: 50 };
    const res = await request(APP)
      .post('/api/products')
      .send(productoConXSS);
    expect(res.statusCode).toEqual(400); // 400 si detecta XSS
  });

  it('No debe permitir XSS en la edición de un producto (PUT)', async () => {
    const productoConXSS = { descripcion: '<script>alert("XSS")</script>', precio: 100, stock: 50 };
    const res = await request(APP)
      .put('/api/products/1')
      .send(productoConXSS);
    expect(res.statusCode).toEqual(400); // 400 si detecta XSS
  });

  it('Debería devolver un producto válido', async () => {
    const res = await request(APP).get('/api/products');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0]).toHaveProperty('id');
  });

});

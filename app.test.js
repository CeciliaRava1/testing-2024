const request = require('supertest');
const app = require('./app');
require('dotenv').config({ path: '.env.test' });


// Mockear el módulo de MySQL
jest.mock('mysql', () => ({
  createConnection: jest.fn(() => ({
    connect: jest.fn((callback) => callback(null)),
    query: jest.fn((query, params, callback) => {
      // Simula respuestas para las diferentes consultas SQL
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

describe('API Products', () => {
  it('Debería devolver una respuesta exitosa para la ruta raíz', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual('¡Conexión exitosa!');
  });

  it('Debería crear un nuevo producto', async () => {
    const nuevoProducto = { descripcion: 'Nuevo producto', precio: 200, stock: 20 };
    const res = await request(app)
      .post('/api/products')
      .send(nuevoProducto);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.descripcion).toBe(nuevoProducto.descripcion);
    expect(res.body.precio).toBe(nuevoProducto.precio);
  });

  it('Debería actualizar un producto existente', async () => {
    const productoEditado = { descripcion: 'Producto Editado', precio: 150, stock: 15 };
    const res = await request(app)
      .put('/api/products/1') // Edita el producto con ID 1
      .send(productoEditado);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('affectedRows', 1);
  });

  it('Debería borrar un producto', async () => {
    const res = await request(app).delete('/api/products/1');
    expect(res.statusCode).toEqual(200);
    // Verifica que affectedRows sea 1, lo que indica que se eliminó
    expect(res.body).toHaveProperty('affectedRows', 1);
  });
});

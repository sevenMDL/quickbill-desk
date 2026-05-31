/**
 * Client Routes - Handles client CRUD operations
 * @module routes/clientRoutes
 * @requires express
 * @requires ../middleware/auth
 * @requires ../middleware/validation
 * @requires ../validation/schemas
 * @requires ../controllers/clientController
 */

const express = require('express');
const { auth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { clientSchemas } = require('../validation/schemas');
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient
} = require('../controllers/clientController');

const router = express.Router();

// Apply authentication to all client routes
router.use(auth);

router.route('/')
  .get(validateRequest(clientSchemas.getClients), getClients)
  .post(validateRequest(clientSchemas.createClient), createClient);

router.route('/:id')
  .get(validateRequest(clientSchemas.getClient), getClient)
  .put(validateRequest(clientSchemas.updateClient), updateClient)
  .delete(validateRequest(clientSchemas.deleteClient), deleteClient);

module.exports = router;

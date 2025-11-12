import { Router } from 'express';

const router = Router();

// replicate behavior of original Next route: throw an error to test monitoring
router.get('/', (req, res) => {
  throw new Error('This error is raised on the backend called by the example page.');
});

export default router;

import { Router } from 'express';
import { 
    getProfile, 
    updatePassword, 
    updateProfile, 
    updatePreferences, 
    updateImage 
} from '../controllers/user_controller.js';
import { verifyAuth } from '../middlewares/auth.js';

const router = Router();
router.use(verifyAuth);

router.get('/estudiante/perfil', getProfile);
router.put('/estudiante/actualizarpassword', updatePassword); 
router.put('/estudiante/:id', updateProfile);
router.put('/preferencias', updatePreferences);
router.post('/actualizar-imagen', updateImage);

export default router;
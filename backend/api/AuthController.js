// controllers/AuthController.js
import User from '../models/Usuarios.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export default class AuthController {
     static async login(req,res,next ){

 const { email, password } = req.body;
 console.log(req.body)
  try {
    const user = await User.findOne({ email, provider: 'email' });
    if (!user) return res.status(400).json({ message: 'Usuario no encontrado' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user._id }, 'secreto_super_seguro', { expiresIn: '7d' });

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        language: user.language,
        categories: user.categories,
       
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error en servidor' });
  }
    }
}




/*import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export default class AuthController {
    static async login(req, res) {
        const { username, password } = req.body;

        try {
            const user = await User.findOne({ username }).populate('role');

            if (!user) {
                return res.status(404).json({ error: 'User does not exist' });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Incorrect password' });
            }

            // Convertir el objeto role a un JSON plano
            const role = {
                _id: user.role._id,
                name: user.role.name,
                permissions: Object.fromEntries(user.role.permissions),
                __v: user.role.__v
            };

            const token = jwt.sign(
                { id: user._id, username: user.username, nombre: user.Nombre, apellidos: user.Apellidos, FotoDePerfil: user.FotoDePerfil, role, language: user.language },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.json({ token, userId: user._id, username: user.username, nombre: user.Nombre, apellidos: user.Apellidos, FotoDePerfil: user.FotoDePerfil, role, language: user.language });
        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
 */
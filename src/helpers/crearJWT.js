import jwt from 'jsonwebtoken';

const generarJWT = (id, rol) => {
    return jwt.sign({ id, rol }, process.env.JWT_SECRET || "palabrasecreta", {
        expiresIn: '1d' // El token dura 1 día
    });
}

export default generarJWT;
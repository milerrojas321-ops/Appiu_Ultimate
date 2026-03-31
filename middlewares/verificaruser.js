//validar que el usuario exista en el json y el password se correcta

const mibd = require('../data/usuarios.json')
const verificaruser = (req, resp, next) => {

    const credenciales ={
        nombreus = req.body.nombreus,
        contraus = req.body.contraus
    }
    //si los valores de los campos no existen devuelve un estado 400 bad request
    if(credenciales.nombreus || !credenciales.contraus) return resp.sendStatus(400)
    let user = mibd.find(user => user.nombreusuarios === credenciales.nombreus) 
    if(!user) return resp.status(401).json('Nombre de usuario no valido')
    if(user.password != credenciales.contraus) return resp.status(403).json('Password incorrecta')
    next()
}

module.exports = verificaruser
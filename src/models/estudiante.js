import {Schema, model, version} from 'mongoose'
import bcrypt from 'bcryptjs'

const estudianteSchema = new Schema({

    nombre:{
    type:String,
    required:true,
    trim:true
    },

    email:{
    type:String,
    required:true,
    trim:true,
    unique:true
    },

    password:{
    type:String,
    required:true,
    trim:true,
    unique:true
    },

    status:{
    type:Boolean,
    default:true
    },

    token:{
    type:String,
    default:null
    },

    confirmMail:{
    type:Boolean,
    default:false
    },

    rol:{
    type:String,
    default:'estudiante'
    },

    preferences:{
    theme:{type:String,enum:["light","dark"],default:"light"},
    wallpaperUrl:{type:String,default:null}
    },

    googleId: {
        type: String,
        default: null
    },

    escritoriosGuardados: [{
        type: Schema.Types.ObjectId,
        ref: 'estudiante'
    }],


},

{

    timestamps: true

}
);


// Método para cifrar una contraseña

estudianteSchema.methods.encryptPassword = async function(password) {
    const salt = await bcrypt.genSalt(10);
    const passwordEncryp = await bcrypt.hash(password, salt)
    return passwordEncryp
}


// Metodo para verificar si el password es el mismo de la BDD
estudianteSchema.methods.matchPassword = async function(password) {
    const response = await bcrypt.compare(password, this.password);
    return response;
}

// Metodo para crear el token
estudianteSchema.methods.createToken = function() {
    const tokenGenerado = Math.random().toString(36).slice(2);
    this.token = tokenGenerado;
    return tokenGenerado;
}

export default model('estudiante', estudianteSchema)
/**
 * @fileoverview Validadores para autenticación
 * @description Esquemas de validación para endpoints de autenticación
 */

const Joi = require('joi');

const authValidators = {
    // Validador para login
    login: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Debe proporcionar un email válido',
                'any.required': 'El email es requerido'
            }),
        password: Joi.string()
            .min(6)
            .required()
            .messages({
                'string.min': 'La contraseña debe tener al menos 6 caracteres',
                'any.required': 'La contraseña es requerida'
            })
    }),

    // Validador para refresh token
    refresh: Joi.object({
        refreshToken: Joi.string()
            .required()
            .messages({
                'any.required': 'El refresh token es requerido'
            })
    }),

    // Validador para registro de usuario (admin)
    register: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Debe proporcionar un email válido',
                'any.required': 'El email es requerido'
            }),
        password: Joi.string()
            .min(6)
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
            .required()
            .messages({
                'string.min': 'La contraseña debe tener al menos 6 caracteres',
                'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
                'any.required': 'La contraseña es requerida'
            }),
        name: Joi.string()
            .min(2)
            .max(100)
            .required()
            .messages({
                'string.min': 'El nombre debe tener al menos 2 caracteres',
                'string.max': 'El nombre no puede exceder 100 caracteres',
                'any.required': 'El nombre es requerido'
            }),
        role: Joi.string()
            .valid('tecnico', 'supervisor', 'admin')
            .default('tecnico')
            .messages({
                'any.only': 'El rol debe ser tecnico, supervisor o admin'
            }),
        company: Joi.string()
            .min(2)
            .max(100)
            .required()
            .messages({
                'string.min': 'El nombre de la compañía debe tener al menos 2 caracteres',
                'string.max': 'El nombre de la compañía no puede exceder 100 caracteres',
                'any.required': 'La compañía es requerida'
            }),
        phone: Joi.string()
            .pattern(new RegExp('^\\+?[\\d\\s\\-\\(\\)]+$'))
            .optional()
            .messages({
                'string.pattern.base': 'El teléfono debe tener un formato válido'
            })
    }),

    // Validador para cambio de contraseña
    changePassword: Joi.object({
        currentPassword: Joi.string()
            .required()
            .messages({
                'any.required': 'La contraseña actual es requerida'
            }),
        newPassword: Joi.string()
            .min(6)
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
            .required()
            .messages({
                'string.min': 'La nueva contraseña debe tener al menos 6 caracteres',
                'string.pattern.base': 'La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número',
                'any.required': 'La nueva contraseña es requerida'
            }),
        confirmPassword: Joi.string()
            .valid(Joi.ref('newPassword'))
            .required()
            .messages({
                'any.only': 'La confirmación de contraseña debe coincidir con la nueva contraseña',
                'any.required': 'La confirmación de contraseña es requerida'
            })
    }),

    // Validador para reset de contraseña
    resetPassword: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Debe proporcionar un email válido',
                'any.required': 'El email es requerido'
            })
    }),

    // Validador para confirmar reset de contraseña
    confirmResetPassword: Joi.object({
        token: Joi.string()
            .required()
            .messages({
                'any.required': 'El token de reset es requerido'
            }),
        newPassword: Joi.string()
            .min(6)
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
            .required()
            .messages({
                'string.min': 'La contraseña debe tener al menos 6 caracteres',
                'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
                'any.required': 'La contraseña es requerida'
            }),
        confirmPassword: Joi.string()
            .valid(Joi.ref('newPassword'))
            .required()
            .messages({
                'any.only': 'La confirmación de contraseña debe coincidir con la nueva contraseña',
                'any.required': 'La confirmación de contraseña es requerida'
            })
    })
};

module.exports = authValidators;

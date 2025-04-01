
import Joi from 'joi';

//import {JoiExtensionFile} from 'joi-extension-file';
import { commonValidations } from '../../utils/constantValidations';
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}[A-Z]{1}[0-9]{1}$/;
//const JoiExtended = Joi.extend(JoiExtensionFile);
//joi for validation
enum RoleName {
    superadmin = "superadmin",
    admin = "admin",
    student = "student",
    parent = "parent",
}




const userSchema = Joi.object({
    countrycode: Joi.string().required().messages({
        'string.empty': commonValidations.countrycode.empty,
        'any.required': commonValidations.countrycode.required,
        'string.pattern.base': 'Invalid CountryCode'
    }),
    mobileno: Joi.string().required().regex(/^[6-9]\d{9}$/).messages({
        'number.empty': commonValidations.mobileNumber.empty,
        'any.required': commonValidations.mobileNumber.required,
        'string.pattern.base': 'Invalid MobileNumber'
    }),
    firstname: Joi.string().required().messages({
        'string.empty': commonValidations.firstName.empty,
        'any.required': commonValidations.firstName.required,
        'string.pattern.base': 'Invalid MobileNumber'
    }),
    lastname: Joi.string().required().messages({
        'string.empty': commonValidations.lastName.empty,
        'any.required': commonValidations.lastName.required,
        'string.pattern.base': 'Invalid MobileNumber'
    }),
    email: Joi.string().required().email().messages({
        'string.empty': commonValidations.emailID.empty,
        'any.required': commonValidations.emailID.required,
        'string.pattern.base': 'Invalid email'
    }),
    roles: Joi.array().items(Joi.string()).min(1).required().messages({
        'array.base': 'Roles must be an array',
        'array.min': 'At least one role is required',
        'any.required': commonValidations.role.required,
      }),
    
   
});

const roleSchema = Joi.object({
    name: Joi.string()
        .valid(...Object.values(RoleName))  // Enum validation here
        .required()
        .messages({
            'string.empty': commonValidations.role.empty,
            'any.required': commonValidations.role.required,
            'any.only': `Role must be one of [${Object.values(RoleName).join(', ')}]` // Custom message for invalid enum values
        }),
});

const hospitalSchema = Joi.object({
    name: Joi.string().required().messages({
        'string.empty': commonValidations.hospitalname.empty,
        'any.required': commonValidations.hospitalname.required,
        'string.pattern.base': 'Invalid hospital name'
    }),
    countrycode: Joi.string().required().messages({
        'string.empty': commonValidations.countrycode.empty,
        'any.required': commonValidations.countrycode.required,
        'string.pattern.base': 'Invalid CountryCode'
    }),
    mobileno: Joi.string().required().regex(/^[6-9]\d{9}$/).messages({
        'string.empty': commonValidations.mobileNumber.empty,
        'any.required': commonValidations.mobileNumber.required,
        'string.pattern.base': commonValidations.mobileNumber.invalid
    }),
    email: Joi.string().required().email().messages({
        'string.empty': commonValidations.emailID.empty,
        'any.required': commonValidations.emailID.required,
        'string.email': commonValidations.emailID.invalid
    }),

    // Adding `poc` field with commonValidations
    poc: Joi.object({
        firstname: Joi.string().required().messages({
            'string.empty': commonValidations.firstName.empty,
            'any.required': commonValidations.firstName.required
        }),
        lastname: Joi.string().required().messages({
            'string.empty': commonValidations.lastName.empty,
            'any.required': commonValidations.lastName.required
        }),
        email: Joi.string().required().email().messages({
            'string.empty': commonValidations.emailID.empty,
            'any.required': commonValidations.emailID.required,
            'string.email': commonValidations.emailID.invalid
        }),
        countrycode: Joi.string().required().messages({
            'string.empty': commonValidations.countrycode.empty,
            'any.required': commonValidations.countrycode.required
        }),
        mobileno: Joi.string().required().regex(/^[6-9]\d{9}$/).messages({
            'string.empty': commonValidations.mobileNumber.empty,
            'any.required': commonValidations.mobileNumber.required,
            'string.pattern.base': commonValidations.mobileNumber.invalid
        })
    }).required().messages({
        'object.base': commonValidations.poc.invalid,
        'any.required': commonValidations.poc.required
    })
});







export const joiSchema = {
    userSchema,
    roleSchema,
    hospitalSchema,
   
}
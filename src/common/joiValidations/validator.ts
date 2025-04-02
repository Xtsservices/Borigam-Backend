
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
const studentSchema = Joi.object({
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



const courseSchema = Joi.object({
    name: Joi.string()
        .required()
        .messages({
            'string.empty': commonValidations.course.empty,
            'any.required': commonValidations.course.required,
        }),
});

export const questionWithOptionsSchema = Joi.object({
    name: Joi.string().required().messages({
        'string.empty': commonValidations.question.empty,
        'any.required': commonValidations.question.required,
    }),
    type: Joi.string().valid('radio', 'blank', 'multiple_choice', 'text').required().messages({
        'string.empty': commonValidations.type.empty,
        'any.required': commonValidations.type.required,
        'any.only': `Type must be one of ['radio', 'blank', 'multiple_choice', 'text']`,
    }),

    course_id: Joi.number().required().messages({
        'number.base': 'Course ID must be a valid number',
        'any.required': commonValidations.course.required,
    }),

    options: Joi.when('type', {
        is: Joi.string().valid('radio', 'multiple_choice'),  // Check if type is 'radio' or 'multiple_choice'
        then: Joi.array().items(
            Joi.object({
                option_text: Joi.string().required().messages({
                    'string.empty': commonValidations.optionText.empty,
                    'any.required': commonValidations.optionText.required,
                }),
                is_correct: Joi.boolean().required().messages({
                    'boolean.base': 'is_correct must be a boolean',
                    'any.required': "is_correct is required",
                }),
            }).required()
        ).min(2).max(10).required().messages({
            'array.base': 'Options must be an array',
            'array.min': 'At least two options are required',
            'array.max': 'A maximum of ten options are allowed',
            'any.required': 'Options are required',
        }),
        otherwise: Joi.array().optional().messages({
            'array.base': 'Options must be an array',
        })
    })
});


export const testWithQuestionsSchema = Joi.object({
    name: Joi.string().max(255).required().messages({
      'string.base': `"name" should be a type of 'text'`,
      'string.empty': `"name" cannot be an empty field`,
      'any.required': `"name" is a required field`,
    }),
    duration: Joi.number().integer().min(1).required().messages({
      'number.base': `"duration" should be a type of 'number'`,
      'number.min': `"duration" should be at least 1 minute`,
      'any.required': `"duration" is a required field`,
    }),
    questions: Joi.array().items(Joi.number().integer()).min(1).required().messages({
      'array.base': `"questions" should be an array`,
      'array.min': `"questions" should contain at least 1 question`,
      'any.required': `"questions" is a required field`,
    }),
  });

  export const collegeSchema = Joi.object({
    name: Joi.string().max(255).required().messages({
        'string.empty': commonValidations.collegeName.empty,
        'any.required': commonValidations.collegeName.required,
    }),
    address: Joi.string().required().messages({
        'string.empty': commonValidations.address.empty,
        'any.required': commonValidations.address.required,
    }),

    contact: Joi.object({
        firstname: Joi.string().max(100).required().messages({
            'string.empty': commonValidations.firstName.empty,
            'any.required': commonValidations.firstName.required,
        }),
        lastname: Joi.string().max(100).required().messages({
            'string.empty': commonValidations.lastName.empty,
            'any.required': commonValidations.lastName.required,
        }),
        email: Joi.string().email().required().messages({
            'string.empty': commonValidations.emailID.empty,
            'any.required': commonValidations.emailID.required,
            'string.email': 'Invalid email format',
        }),
        countrycode: Joi.string().max(10).required().messages({
            'string.empty': commonValidations.countrycode.empty,
            'any.required': commonValidations.countrycode.required,
        }),
        mobileno: Joi.string().regex(/^[6-9]\d{9}$/).required().messages({
            'string.empty': commonValidations.mobileNumber.empty,
            'any.required': commonValidations.mobileNumber.required,
            'string.pattern.base': 'Invalid mobile number format',
        }),
    }).required(),
});









export const joiSchema = {
    userSchema,
    roleSchema,
    courseSchema,
    questionWithOptionsSchema,
    testWithQuestionsSchema,
    collegeSchema,
    studentSchema,

    
   
}
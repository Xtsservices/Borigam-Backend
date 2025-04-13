
import Joi from 'joi';
import moment from "moment";


//import {JoiExtensionFile} from 'joi-extension-file';
import { commonValidations } from '../../utils/constantValidations';
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}[A-Z]{1}[0-9]{1}$/;
const dateRegex = /^\d{2}-\d{2}-\d{4}$/;

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
const updatecourseSchema = Joi.object({
    name: Joi.string()
        .required()
        .messages({
            'string.empty': commonValidations.course.empty,
            'any.required': commonValidations.course.required,
        }),
        id: Joi.number()
        .required()
        .messages({
            'string.empty': commonValidations.courseID.empty,
            'any.required': commonValidations.courseID.required,
        }),
});

const subjectSchema = Joi.object({
    name: Joi.string()
        .required()
        .messages({
            'string.empty': commonValidations.subject.empty,
            'any.required': commonValidations.subject.required,
        }),
        course_id: Joi.number()
            .integer()
            .required()
            .messages({
                'number.base': commonValidations.course.invalid,
                'any.required': commonValidations.course.required,
            })
});


export const questionWithOptionsSchema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid("radio", "checkbox", "text").required(),
    course_id: Joi.number().required(),
    total_marks: Joi.number().required(),
    negative_marks: Joi.number().required(),
    image: Joi.string().uri().optional(),  // Allow image as a URL or string (if it's sent as base64 or URL)
    options: Joi.array()
      .items(
        Joi.object({
          option_text: Joi.string().required(),
          is_correct: Joi.boolean().required(),
          image: Joi.string().uri().optional(),  // Allow option image as a URL if it's passed
        })
      )
      .min(1)
      .required(),
  });
  
  



export const testWithQuestionsSchema = Joi.object({
    name: Joi.string().required(),
    duration: Joi.number().positive().required(),
    course_id: Joi.number().integer().positive().required(),
    start_date: Joi.string().required(), // Expecting "DD-MM-YYYY"
    end_date: Joi.string().required(),   // Expecting "DD-MM-YYYY"
    batch_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    questions: Joi.array().items(Joi.number().integer().positive()).optional()
  });
  

  export const collegeSchema = Joi.object({
    name: Joi.string().max(255).required().messages({
        'string.empty': commonValidations.collegeName.empty,
        'any.required': commonValidations.collegeName.required,
    }),
    code: Joi.string().max(255).required().messages({
        'string.empty': commonValidations.collegeCode.empty,
        'any.required': commonValidations.collegeCode.required,
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







const submitTestSchema = Joi.object({
    test_id: Joi.number().integer().required(),
    answers: Joi.array().items(
        Joi.object({
            question_id: Joi.number().integer().required(),
            option_id: Joi.number().integer().allow(null),
            text: Joi.string().allow(null, "")
        })
    ).required()
});



export const assignStudentSchema = Joi.object({
    studentId: Joi.number().integer().positive().required().messages({
        "number.base": "Student ID must be a number",
        "number.integer": "Student ID must be an integer",
        "number.positive": "Student ID must be a positive number",
        "any.required": "Student ID is required"
    }),

    courseId: Joi.number().integer().positive().required().messages({
        "number.base": "Course ID must be a number",
        "number.integer": "Course ID must be an integer",
        "number.positive": "Course ID must be a positive number",
        "any.required": "Course ID is required"
    }),

    batchId: Joi.number().integer().positive().required().messages({
        "number.base": "Batch ID must be a number",
        "number.integer": "Batch ID must be an integer",
        "number.positive": "Batch ID must be a positive number",
        "any.required": "Batch ID is required"
    }),

    // startDate: Joi.string()
    //     .pattern(/^\d{2}-\d{2}-\d{4}$/)
    //     .required()
    //     .messages({
    //         "string.pattern.base": "Start Date must be in DD-MM-YYYY format",
    //         "any.required": "Start Date is required"
    //     }),

    // endDate: Joi.string()
    //     .pattern(/^\d{2}-\d{2}-\d{4}$/)
    //     .required()
    //     .custom((value, helpers) => {
    //         const { startDate } = helpers.state.ancestors[0];
    //         const start = moment(startDate, "DD-MM-YYYY", true);
    //         const end = moment(value, "DD-MM-YYYY", true);

    //         if (!end.isValid()) {
    //             return helpers.error("any.invalid", { message: "End Date must be in DD-MM-YYYY format" });
    //         }

    //         if (!start.isValid()) {
    //             return helpers.error("any.invalid", { message: "Start Date is not valid" });
    //         }

    //         if (end.isSameOrBefore(start)) {
    //             return helpers.error("any.invalid", { message: "End Date must be after Start Date" });
    //         }

    //         return value;
    //     })
});


export const batchSchema= Joi.object({
    name: Joi.string().required(),
    course_id: Joi.number().required(),
    start_date: Joi.string().pattern(dateRegex).required().messages({
        'string.pattern.base': `"start_date" must be in DD-MM-YYYY format`,
        'any.required': `"start_date" is a required field`,
      }),
    
      end_date: Joi.string().pattern(dateRegex).required().messages({
        'string.pattern.base': `"end_date" must be in DD-MM-YYYY format`,
        'any.required': `"end_date" is a required field`,
      }),
    // college_id not needed from body — coming from token
})

export const testBatchSchema = Joi.object({
    test_id: Joi.number().integer().positive().required(),
    batch_id: Joi.number().integer().positive().required(),
    created_at: Joi.number().required()
  });

  const updateBatchSchema = Joi.object({
    id: Joi.number().required(),
    name: Joi.string().required(),
    start_date: Joi.string().optional(), // Format: DD-MM-YYYY
    end_date: Joi.string().optional()
  });
  



export const joiSchema = {
    userSchema,
    roleSchema,
    courseSchema,
    questionWithOptionsSchema,
    testWithQuestionsSchema,
    collegeSchema,
    studentSchema,
    submitTestSchema,
    assignStudentSchema,
    subjectSchema,
    batchSchema,
    testBatchSchema,
    updatecourseSchema,
    updateBatchSchema

    
   
}
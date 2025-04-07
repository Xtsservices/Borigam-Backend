export interface CourseStudent {
    course_id: number;
    batch_id:number;
    student_id: number;
    start_date: string; // Assuming dates are stored as strings in ISO format
    end_date: string;
}

export const courseStudentsSchema = {
    course_id: { type: 'number', required: true },
    batch_id: { type: 'number', required: true },

    student_id: { type: 'number', required: true },
    start_date: { type: 'string', required: true }, // Should be in ISO format (YYYY-MM-DD)
    end_date: { type: 'string', required: true },   // Should be in ISO format (YYYY-MM-DD)
};

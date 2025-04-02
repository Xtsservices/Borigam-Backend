export interface College {
    id: number;
    name: string;
    address: string;
    status: number;
}
  
export const collegeSchema = {
    name: { type: 'string', required: true, unique: true },
    address: { type: 'string', required: true },
    status: { type: 'number', required: true },
};
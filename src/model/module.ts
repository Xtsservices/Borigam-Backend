export interface Module {
    id: number;
    name: string;
    status: number;
  }

  export const moduleSchema = {
    name: { type: 'string', required: true, unique: true },
    status: { type: 'number', required: true }
  };
  
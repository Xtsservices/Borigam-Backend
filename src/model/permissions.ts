export interface Permission {
    id: number;
    role_id: number;
    module_id: number;
    read_permission: boolean;
    write_permission: boolean;
    update_permission: boolean;
    delete_permission: boolean;
    created_at?: number;
    updated_at?: number;
  }
  export const permissionSchema = {
    role_id: { type: 'number', required: true },
    module_id: { type: 'number', required: true },
    read_permission: { type: 'boolean', required: true },
    write_permission: { type: 'boolean', required: true },
    update_permission: { type: 'boolean', required: true },
    delete_permission: { type: 'boolean', required: true },
    created_at: { type: 'number', required: false },
    updated_at: { type: 'number', required: false }
  };
  
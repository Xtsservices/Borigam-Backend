export interface Announcement {
  id?: number;
  start_date: number;
  end_date: number;
  text: string;
  status: string;
  created_by_id: number;
  updated_by_id: number;
  created_date?: number;
  updated_date?: number;
}


  export const AnnouncementSchema = {
    start_date: { type: 'number', required: true },
    end_date: { type: 'number', required: true },
    text: { type: 'string', required: true }, // Use 'date' if your validation supports it
    status: { type: 'number', required: true },
    created_by_id: { type: 'number', required: true },

    updated_by_id: { type: 'number', required: true },

    created_date: { type: 'number', required: true },

    updated_date: { type: 'number', required: true },



  };



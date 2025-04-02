export const testSchema = {
    id: { type: "serial", primary: true },
    name: { type: "string", notNull: true },
    duration: { type: "integer", notNull: true },
    created_at: { type: "timestamp", default: "now()" }
};

import { pgTable, serial, varchar, char, timestamp, text } from 'drizzle-orm/pg-core';

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  urut: varchar('urut', { length: 10 }),
  nipd: varchar('nipd', { length: 50 }).notNull(),
  nisn: varchar('nisn', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  jk: char('jk', { length: 1 }).notNull(), // L or P
  namawalas: varchar('namawalas', { length: 255 }).notNull(),
  peminatan: varchar('peminatan', { length: 100 }).notNull(),
  kelas: varchar('kelas', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const config = pgTable('config', {
  key: varchar('key', { length: 50 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});

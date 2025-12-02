import { z } from "zod";
import {
  insertProductSchema,
  InsertCartSchema,
  cartItemSchema,
} from "@/lib/validators";

export type Product = z.infer<typeof insertProductSchema> & {
  id: string;
  rating: string;
  numReviews: number;
  createdAt: Date;
};

export type Cart = z.infer<typeof InsertCartSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;

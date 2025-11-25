"use server";
import { signInFormSchema } from "../validators";
import { signIn, signOut } from "@/auth";
import {
  isRedirectError,
  RedirectError,
} from "next/dist/client/components/redirect-error";
import { redirect } from "next/dist/server/api-utils";
import { success } from "zod";

//Sign in the user credentials

export async function signInWithCredentials(
  prevState: unknown,
  formData: FormData
) {
  try {
    const user = signInFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    await signIn("credentials", user);
    return { success: true, message: "Signed in successfully" };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: "Invalid email or password" };
  }
}

// Sign user out

export async function signOutUser() {
  await signOut();
}

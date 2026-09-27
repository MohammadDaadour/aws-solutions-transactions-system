"use server"

import { signIn } from "../../auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
    try {
        const data = Object.fromEntries(formData);
        await signIn("credentials", {
            ...data,
            redirectTo: "/dashboard",
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return { error: "Invalid username or password configuration." };
        }
        throw error;
    }
}